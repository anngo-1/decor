'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree, ThreeEvent, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, PointerLockControls, Bvh, Environment, Grid, Sky } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { SceneItems } from './SceneItems'
import { WallSystem, WallPreview, RoomCeilingAndFloor } from './WallSystem'
import { SceneLoader } from './SceneLoader'
import { useStore } from '@/store/useStore'
import { snapToGrid, snapPoint, snapToPoint, applyAlignmentSnap } from '@/utils/grid'
import type { Vec2, PlacedLight } from '@/types'



const SKY_PRESETS: Record<string, { turbidity: number; rayleigh: number; mieCoeff: number; mieG: number; elevation?: number }> = {
    city: { turbidity: 2, rayleigh: 1.0, mieCoeff: 0.005, mieG: 0.80 },
    apartment: { turbidity: 5, rayleigh: 2.0, mieCoeff: 0.020, mieG: 0.85 },
    sunset: { turbidity: 10, rayleigh: 3.0, mieCoeff: 0.080, mieG: 0.98, elevation: 2 },
    dawn: { turbidity: 6, rayleigh: 2.0, mieCoeff: 0.040, mieG: 0.82, elevation: 5 },
    night: { turbidity: 20, rayleigh: 0.2, mieCoeff: 0.002, mieG: 0.90, elevation: -4 },
}

function SceneSky() {
    const sunAzimuth = useStore((s) => s.sunAzimuth)
    const sunElevation = useStore((s) => s.sunElevation)
    const environmentPreset = useStore((s) => s.environmentPreset)
    const params = SKY_PRESETS[environmentPreset] ?? SKY_PRESETS.city
    const effectiveElevation = params.elevation ?? sunElevation
    const phi = (90 - effectiveElevation) * (Math.PI / 180)
    const theta = sunAzimuth * (Math.PI / 180)
    return (
        <Sky
            distance={450000}
            sunPosition={[Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)]}
            turbidity={params.turbidity}
            rayleigh={params.rayleigh}
            mieCoefficient={params.mieCoeff}
            mieDirectionalG={params.mieG}
        />
    )
}

function SunGizmo() {
    const showLightingControls = useStore((s) => s.showLightingControls)
    const sunAzimuth = useStore((s) => s.sunAzimuth)
    const sunElevation = useStore((s) => s.sunElevation)

    if (!showLightingControls) return null

    const phi = (90 - sunElevation) * (Math.PI / 180)
    const theta = (sunAzimuth) * (Math.PI / 180)
    const radius = 15 // Closer than the actual light for visibility

    const x = radius * Math.sin(phi) * Math.sin(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.cos(theta)

    return (
        <group position={[x, y, z]}>
            {/* The Sun Sphere */}
            <mesh>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial
                    color="#ffcc33"
                    emissive="#ffcc33"
                    emissiveIntensity={2}
                    toneMapped={false}
                />
            </mesh>

            {/* Glowing Aura */}
            <mesh scale={2}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshBasicMaterial
                    color="#ffcc33"
                    transparent
                    opacity={0.2}
                    toneMapped={false}
                />
            </mesh>

            {/* Direction Indicator */}
            <mesh position={[-x / radius * 0.5, -y / radius * 0.5, -z / radius * 0.5]} rotation={[phi, theta, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 1]} />
                <meshBasicMaterial color="#ffcc33" transparent opacity={0.5} />
            </mesh>
        </group>
    )
}


/**
 * Disconnects R3F's raycasting event system while OrbitControls is actively
 * dragging. During orbit, pointermove fires continuously and R3F would normally
 * raycast against every mesh in the scene (to track onPointerOver/Out hover
 * state), which is wasted work and causes GC pressure. Disconnecting R3F's
 * event listeners for the duration of the drag eliminates this entirely.
 */
function OrbitEventSuppressor({ orbitRef }: { orbitRef: React.RefObject<OrbitControlsImpl | null> }) {
    const get = useThree((s) => s.get)
    useEffect(() => {
        const controls = orbitRef.current
        if (!controls) return
        const onStart = () => {
            const { events } = get()
            events.disconnect?.()
        }
        const onEnd = () => {
            const { events, gl } = get()
            events.connect?.(gl.domElement)
        }
        controls.addEventListener('start', onStart)
        controls.addEventListener('end', onEnd)
        return () => {
            controls.removeEventListener('start', onStart)
            controls.removeEventListener('end', onEnd)
        }
    }, [get, orbitRef])
    return null
}

/** Captures screenshots from the renderer and registers them in the store. */
function ScreenshotManager() {
    const { gl, scene, camera } = useThree()
    const setGetScreenshot = useStore((s) => s.setGetScreenshot)

    useEffect(() => {
        // Sky is part of the scene (Sky mesh), so a plain render captures it correctly.
        const getScreenshot = () => {
            gl.render(scene, camera)
            return gl.domElement.toDataURL('image/jpeg', 0.8)
        }
        setGetScreenshot(getScreenshot)
        return () => setGetScreenshot(null)
    }, [gl, scene, camera, setGetScreenshot])

    return null
}

/** Attaches native drag-drop events to the gl.domElement canvas for furniture + window placement. */
function DragDropHandler() {
    const { camera, gl, scene } = useThree()
    const cameraRef = useRef(camera)
    const sceneRef = useRef(scene)
    useEffect(() => { cameraRef.current = camera }, [camera])
    useEffect(() => { sceneRef.current = scene }, [scene])

    useEffect(() => {
        const canvas = gl.domElement
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        const raycaster = new THREE.Raycaster()
        const hit = new THREE.Vector3()

        /** Returns NDC coords from a DragEvent relative to the canvas. */
        const getNDC = (e: DragEvent) => {
            const rect = canvas.getBoundingClientRect()
            return new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1,
            )
        }

        const onDragOver = (e: DragEvent) => {
            e.preventDefault()
            const { draggedLibraryItem, setDragHoverPoint, setDragWindowHit, roomPolygons } = useStore.getState()
            if (!draggedLibraryItem) return

            raycaster.setFromCamera(getNDC(e), cameraRef.current)

            if (draggedLibraryItem.isWindow) {
                // --- Window: snap to wall face ---
                const wallMeshes: THREE.Object3D[] = []
                sceneRef.current.traverse((obj) => { if (obj.userData.isWall) wallMeshes.push(obj) })

                const hits = raycaster.intersectObjects(wallMeshes, false)
                if (hits.length > 0) {
                    const wallHit = hits[0]
                    const { polygonId, segmentIndex } = wallHit.object.userData as { polygonId: string; segmentIndex: number }
                    const poly = roomPolygons.find((p) => p.id === polygonId)
                    if (poly) {
                        const pts = poly.points
                        const pairs: Array<[{ x: number; z: number }, { x: number; z: number }]> = []
                        for (let i = 0; i < pts.length - 1; i++) pairs.push([pts[i], pts[i + 1]])
                        if (poly.closed) pairs.push([pts[pts.length - 1], pts[0]])
                        const [p1, p2] = pairs[segmentIndex]
                        const dx = p2.x - p1.x, dz = p2.z - p1.z
                        const length = Math.sqrt(dx * dx + dz * dz)
                        if (length > 0) {
                            const dirX = dx / length, dirZ = dz / length
                            const wallAngle = Math.atan2(dx, dz)
                            const winSize = draggedLibraryItem.defaultWindowSize ?? { width: 1.2, height: 1.2, sillHeight: 0.9 }
                            const halfW = winSize.width / 2
                            const margin = halfW / length
                            const t = Math.max(margin + 0.01, Math.min(1 - margin - 0.01,
                                ((wallHit.point.x - p1.x) * dirX + (wallHit.point.z - p1.z) * dirZ) / length
                            ))
                            const winX = p1.x + t * dx
                            const winZ = p1.z + t * dz
                            const winY = winSize.sillHeight + winSize.height / 2
                            setDragWindowHit({
                                polygonId,
                                segmentIndex,
                                positionAlongWall: t,
                                worldPosition: [winX, winY, winZ],
                                wallAngle,
                                windowSize: winSize,
                            })
                        }
                    }
                } else {
                    setDragWindowHit(null)
                }
                return // don't update ground hover for windows
            }

            // --- Furniture: snap to ground plane ---
            if (raycaster.ray.intersectPlane(groundPlane, hit)) {
                setDragHoverPoint([snapToGrid(hit.x), 0, snapToGrid(hit.z)])
            }
        }

        const onDragLeave = () => {
            useStore.getState().setDragHoverPoint(null)
            useStore.getState().setDragWindowHit(null)
        }

        const onDrop = (e: DragEvent) => {
            e.preventDefault()
            const { draggedLibraryItem, dragWindowHit, placeItem, setDraggedLibraryItem, setDragHoverPoint, setDragWindowHit } = useStore.getState()
            if (!draggedLibraryItem) return

            if (draggedLibraryItem.isWindow) {
                if (dragWindowHit) {
                    placeItem({
                        name: draggedLibraryItem.name,
                        modelUrl: '',
                        isWindow: true,
                        wallRef: {
                            polygonId: dragWindowHit.polygonId,
                            segmentIndex: dragWindowHit.segmentIndex,
                            positionAlongWall: dragWindowHit.positionAlongWall,
                        },
                        windowSize: dragWindowHit.windowSize,
                        position: dragWindowHit.worldPosition,
                        rotation: [0, dragWindowHit.wallAngle, 0],
                        scale: 1,
                    })
                }
                setDraggedLibraryItem(null)
                setDragWindowHit(null)
                return
            }

            // --- Furniture drop ---
            raycaster.setFromCamera(getNDC(e), cameraRef.current)
            raycaster.ray.intersectPlane(groundPlane, hit)
            placeItem({
                name: draggedLibraryItem.name,
                modelUrl: draggedLibraryItem.modelUrl,
                position: [snapToGrid(hit.x), 0, snapToGrid(hit.z)],
                rotation: [0, 0, 0],
                scale: 1,
                price: draggedLibraryItem.price,
                affiliateUrl: draggedLibraryItem.affiliateUrl,
                thumbnailUrl: draggedLibraryItem.thumbnailUrl,
                isGenerated: draggedLibraryItem.category === 'Generated',
                floorTile: draggedLibraryItem.floorTile,
            })
            setDraggedLibraryItem(null)
            setDragHoverPoint(null)
        }

        canvas.addEventListener('dragover', onDragOver)
        canvas.addEventListener('dragleave', onDragLeave)
        canvas.addEventListener('drop', onDrop)
        return () => {
            canvas.removeEventListener('dragover', onDragOver)
            canvas.removeEventListener('dragleave', onDragLeave)
            canvas.removeEventListener('drop', onDrop)
        }
    }, [gl])

    return null
}

/**
 * Ground plane that handles wall drawing interactions.
 *
 * Distinguishes click (place point) from drag (orbit) by measuring pointer
 * movement between pointerdown and pointerup — if the cursor moved more than
 * a small threshold it's treated as a camera drag, not a placement.
 */
function WallInteractionPlane() {
    const activeTool = useStore((s) => s.activeTool)
    const isDrawingWall = useStore((s) => s.isDrawingWall)
    const addWallPoint = useStore((s) => s.addWallPoint)
    const closeWallPolygon = useStore((s) => s.closeWallPolygon)
    const currentWallPoints = useStore((s) => s.currentWallPoints)
    const roomPolygons = useStore((s) => s.roomPolygons)
    const setHoverPoint = useStore((s) => s.setHoverPoint)

    // Track pointer position at mousedown so we can ignore drags
    const downPos = useRef<{ x: number; y: number } | null>(null)
    const DRAG_THRESHOLD_PX = 5

    const active = activeTool === 'wall' && isDrawingWall

    // All confirmed wall endpoints — used for point-snap and alignment-snap.
    // Excludes the last current point (rubber-band origin) to avoid snapping back to it.
    const snapCandidates = useMemo(() => {
        const pts: Vec2[] = []
        roomPolygons.forEach((poly) => pts.push(...poly.points))
        currentWallPoints.slice(0, -1).forEach((p) => pts.push(p))
        return pts
    }, [roomPolygons, currentWallPoints])

    // Snap chain: point snap → alignment snap → grid snap
    const resolveSnap = useCallback((x: number, z: number, shiftHeld: boolean): Vec2 => {
        const pointHit = snapToPoint(x, z, snapCandidates)
        if (pointHit) return pointHit
        const gridPt = snapPoint(x, z, shiftHeld, currentWallPoints.at(-1) ?? null)
        return applyAlignmentSnap(gridPt, snapCandidates)
    }, [snapCandidates, currentWallPoints])

    const handlePointerMove = useCallback(
        (e: ThreeEvent<PointerEvent>) => {
            if (!active) return
            setHoverPoint(resolveSnap(e.point.x, e.point.z, e.shiftKey))
        },
        [active, resolveSnap, setHoverPoint]
    )

    const handlePointerLeave = useCallback(() => {
        setHoverPoint(null)
    }, [setHoverPoint])

    const handlePointerDown = useCallback(
        (e: ThreeEvent<PointerEvent>) => {
            if (!active) return
            downPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
        },
        [active]
    )

    const handlePointerUp = useCallback(
        (e: ThreeEvent<PointerEvent>) => {
            if (!active || !downPos.current) return

            // Ignore if cursor moved too far (it's a camera drag, not a click)
            const dx = e.nativeEvent.clientX - downPos.current.x
            const dy = e.nativeEvent.clientY - downPos.current.y
            downPos.current = null
            if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) return

            e.stopPropagation()
            const pt = resolveSnap(e.point.x, e.point.z, e.shiftKey)

            // If we already have 1 point, this click completes the segment
            if (currentWallPoints.length === 1) {
                useStore.getState().addWallSegment([...currentWallPoints, pt])
                return
            }

            addWallPoint(pt)
        },
        [active, currentWallPoints, addWallPoint, resolveSnap]
    )

    return (
        <mesh
            position={[0, -0.01, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
        >
            <planeGeometry args={[200, 200]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} side={THREE.DoubleSide} />
        </mesh>
    )
}

/**
 * Custom Zoom Handler that bypasses OrbitControls for zooming.
 * OrbitControls struggles with Mac trackpad pixel deltas, making zoom feel incredibly laggy and slow.
 * This intercepts the wheel event, manually moves the camera based on raw pixel deltas, 
 * and stops propagation so OrbitControls ignores the zoom input entirely.
 */
function CustomZoomHandler({ orbitRef, readonly = false }: { orbitRef: React.RefObject<OrbitControlsImpl | null>, readonly?: boolean }) {
    const { gl, camera } = useThree()

    useEffect(() => {
        const canvas = gl.domElement
        const onWheel = (e: WheelEvent) => {
            // If dragging over a UI element, don't zoom the canvas
            if (e.defaultPrevented) return

            // If no ctrlKey on a Mac, it's a pan/scroll gesture, not a pinch-to-zoom gesture
            // When readonly (in the Feed), we want scrolling to scroll the page, not zoom the canvas
            if (!e.ctrlKey && readonly) {
                e.stopImmediatePropagation()
                return
            }

            // Stop OrbitControls from seeing it, because its internal delta normalization is broken for trackpads.
            e.preventDefault()
            e.stopImmediatePropagation()

            if (!orbitRef.current) return

            // Zoom sensitivity multiplier (mouse wheels send much larger deltaY than trackpad pinch)
            const isTrackpadPinch = e.ctrlKey
            const zoomSpeed = isTrackpadPinch ? 0.08 : 0.02

            // Adjust delta based on trackpad movement. 
            // e.deltaY is positive when pinching in (zoom out), negative when pinching out (zoom in)
            const zoomDelta = e.deltaY * zoomSpeed

            // Move the camera along its local Z axis (forward/backward)
            camera.translateZ(zoomDelta)

            // Clamp the camera distance based on OrbitControls min/max distance settings
            const targetDistance = camera.position.distanceTo(orbitRef.current.target)
            if (targetDistance < orbitRef.current.minDistance) {
                camera.translateZ(-(orbitRef.current.minDistance - targetDistance))
            } else if (targetDistance > orbitRef.current.maxDistance) {
                camera.translateZ(targetDistance - orbitRef.current.maxDistance)
            }

        }

        // Must happen before OrbitControls captures the event
        canvas.addEventListener('wheel', onWheel, { capture: true, passive: false })
        return () => canvas.removeEventListener('wheel', onWheel, { capture: true })
    }, [gl, camera, orbitRef, readonly])

    return null
}

export function RoomCanvas({ readonly = false }: { readonly?: boolean }) {
    const activeTool = useStore((s) => s.activeTool)
    const shadowsEnabled = useStore((s) => s.shadowsEnabled)
    const orbitRef = useRef<OrbitControlsImpl | null>(null)
    const setSelection = useStore((s) => s.setSelection)
    const isPointerLocked = useStore((s) => s.isPointerLocked)

    return (
        <Canvas
            frameloop="always"
            shadows={{ type: THREE.PCFSoftShadowMap }}
            dpr={[1, 1.5]}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                // preserveDrawingBuffer intentionally omitted — it causes a
                // 30-50% GPU perf regression on tile-based GPUs (Apple Silicon).
                // Screenshots still work: ScreenshotManager calls gl.render()
                // then toDataURL() synchronously before the frame is presented.
            }}
            style={{ background: '#d0e8ff' }}
            onPointerMissed={() => {
                if (activeTool === 'select') {
                    setSelection(null)
                }
            }}
        >
            <PerspectiveCamera makeDefault position={[0, 12, 14]} fov={50} near={0.5} far={100} />

            <SceneLoader />
            <DragDropHandler />
            <ScreenshotManager />
            <SunGizmo />
            <SceneSky />


            <Suspense fallback={<ambientLight intensity={0.5} />}>
                <AmbientLightRig />
            </Suspense>

            <SunLight />
            <PlacedLights orbitRef={orbitRef} />

            {/* Floor background — sits behind the grid so transparent grid cells
                show this neutral surface instead of the sky at the horizon.
                200×200 keeps all corners within the camera far=100m frustum,
                preventing depth-clamping artifacts in the SSAO pass. */}
            {!readonly && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
                    <planeGeometry args={[200, 200]} />
                    <meshBasicMaterial color="#ffffff" depthWrite={false} toneMapped={false} />
                </mesh>
            )}

            {!readonly && (
                <Grid
                    args={[200, 200]}
                    position={[0, -0.01, 0]}
                    cellSize={0.1}
                    cellThickness={0.7}
                    cellColor="#d3d0df"
                    sectionSize={1}
                    sectionThickness={1.5}
                    sectionColor="#a8a3c4"
                    fadeDistance={40}
                    fadeStrength={1.2}
                    infiniteGrid
                    material-depthWrite={false}
                />
            )}



            <Bvh firstHitOnly>
                <WallSystem readonly={readonly} />
                <RoomCeilingAndFloor />
                {!readonly && <WallPreview />}
                <SceneItems readonly={readonly} />
            </Bvh>

            {!readonly && activeTool === 'wall' && <WallInteractionPlane />}

            <OrbitControls
                ref={orbitRef}
                makeDefault
                enabled={!isPointerLocked}
                enableDamping
                dampingFactor={0.05}
                minDistance={2}
                maxDistance={40}
                maxPolarAngle={Math.PI / 2.1}
                enableZoom={false} // Disable native zoom to use our custom trackpad handler
                enablePan={true}
                regress // Temporarily lower DPR during active camera movement
            />

            <OrbitEventSuppressor orbitRef={orbitRef} />
            <CustomZoomHandler orbitRef={orbitRef} readonly={readonly} />

            {!readonly && (
                <>
                    {isPointerLocked && <PointerLockControls />}
                    <WASDControls orbitRef={orbitRef} isPointerLocked={isPointerLocked} />
                </>
            )}



        </Canvas>
    )
}

/** Unified WASD + Q/Space movement standard across both modes */
const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _v3 = new THREE.Vector3()
const _velocity = new THREE.Vector3()

function WASDControls({ orbitRef, isPointerLocked }: { orbitRef: React.RefObject<OrbitControlsImpl | null>, isPointerLocked: boolean }) {
    const { camera } = useThree()
    const keys = useRef<Set<string>>(new Set())

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            keys.current.add(e.key.toLowerCase())
        }
        const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
        window.addEventListener('keydown', down)
        window.addEventListener('keyup', up)
        return () => {
            window.removeEventListener('keydown', down)
            window.removeEventListener('keyup', up)
        }
    }, [])

    useFrame((state, delta) => {
        // Force raycaster pointer coordinates to absolute center of screen when pointer is locked.
        if (isPointerLocked && document.pointerLockElement) {
            state.pointer.set(0, 0)
        }

        const k = keys.current
        if (!k.size) {
            // If pointer locked but not moving, continuously adjust orbit target to stay ahead
            // so unlocking doesn't suddenly violently whip the camera around.
            if (isPointerLocked && orbitRef.current) {
                camera.getWorldDirection(_v1)
                orbitRef.current.target.copy(camera.position).add(_v1.multiplyScalar(10))
                orbitRef.current.update()
            }
            return
        }

        const SPEED = 8 // m/s
        _velocity.set(0, 0, 0)

        const forward = _v1.copy(camera.position)
        camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()

        const right = _v2.crossVectors(forward, _v3.set(0, 1, 0)).normalize()

        if (k.has('w')) _velocity.addScaledVector(forward, SPEED * delta)
        if (k.has('s')) _velocity.addScaledVector(forward, -SPEED * delta)
        if (k.has('a')) _velocity.addScaledVector(right, -SPEED * delta)
        if (k.has('d')) _velocity.addScaledVector(right, SPEED * delta)
        if (k.has(' ')) _velocity.y += SPEED * delta
        if (k.has('q')) _velocity.y -= SPEED * delta

        if (_velocity.lengthSq() > 0) {
            camera.position.add(_velocity)
            // Prevent going below ground
            if (camera.position.y < 0.5) camera.position.y = 0.5

            if (!isPointerLocked && orbitRef.current) {
                // In Orbit mode, moving camera also moves the focal point to maintain rig stability
                orbitRef.current.target.add(_velocity)
                orbitRef.current.update()
            }
        }

        if (isPointerLocked && orbitRef.current) {
            // Keep target tethered in front of camera while moving in lock mode
            camera.getWorldDirection(_v1)
            orbitRef.current.target.copy(camera.position).add(_v1.multiplyScalar(10))
            orbitRef.current.update()
        }

    })

    return null
}

function SunLight() {
    const sunAzimuth = useStore((s) => s.sunAzimuth)
    const sunElevation = useStore((s) => s.sunElevation)
    const sunIntensity = useStore((s) => s.sunIntensity)

    const phi = (90 - sunElevation) * (Math.PI / 180)
    const theta = sunAzimuth * (Math.PI / 180)
    const radius = 25
    const x = radius * Math.sin(phi) * Math.sin(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.cos(theta)

    return (
        <directionalLight
            position={[x, y, z]}
            intensity={sunIntensity}
        />
    )
}

/** Handles the HDRI Environment and Ambient base light */
function AmbientLightRig() {
    const environmentPreset = useStore((s) => s.environmentPreset)
    const ceilingEnabled = useStore((s) => s.ceilingEnabled)
    return (
        <>
            {/* Boost ambient when ceiling blocks sun so the room stays lit by default.
                Users are expected to place Custom Lights for interior illumination. */}
            <ambientLight intensity={ceilingEnabled ? 0.3 : 0.07} />
            {/* HDRI used only for IBL reflections — background is driven by the
                sky color derived from the active environment preset instead. */}
            <Environment
                preset={environmentPreset as any}
            />
        </>
    )
}

/** Single draggable light sphere */
function PlacedLightMesh({
    light,
    isSelected,
    onDragStart,
}: {
    light: PlacedLight
    isSelected: boolean
    onDragStart: () => void
}) {
    const setSelection = useStore((s) => s.setSelection)
    const showLightingControls = useStore((s) => s.showLightingControls)
    const shadowsEnabled = useStore((s) => s.shadowsEnabled)
    const { gl } = useThree()

    return (
        <group position={light.position}>
            {/* Invisible hit target — always present for pointer events */}
            <mesh
                onPointerDown={(e) => {
                    e.stopPropagation()
                    setSelection({ type: 'light', id: light.id })
                    onDragStart()
                }}
                onPointerEnter={() => { if (showLightingControls) gl.domElement.style.cursor = 'grab' }}
                onPointerLeave={() => { gl.domElement.style.cursor = '' }}
            >
                <sphereGeometry args={[0.25, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Visible glow orb — only shown while lighting panel is open */}
            {showLightingControls && (
                <>
                    {/* Core */}
                    <mesh>
                        <sphereGeometry args={[0.12, 16, 16]} />
                        <meshBasicMaterial color={light.color} toneMapped={false} />
                    </mesh>
                    {/* Soft aura */}
                    <mesh>
                        <sphereGeometry args={[0.28, 16, 16]} />
                        <meshBasicMaterial color={light.color} transparent opacity={isSelected ? 0.35 : 0.15} toneMapped={false} depthWrite={false} />
                    </mesh>
                    {/* Selected ring */}
                    {isSelected && (
                        <mesh rotation={[-Math.PI / 2, 0, 0]}>
                            <ringGeometry args={[0.38, 0.46, 32]} />
                            <meshBasicMaterial color="#6366f1" side={THREE.DoubleSide} transparent opacity={0.8} />
                        </mesh>
                    )}
                </>
            )}

            <pointLight
                distance={light.distance}
                intensity={light.intensity}
                color={light.color}
                decay={2}
                castShadow={shadowsEnabled}
                shadow-mapSize={[512, 512]}
                shadow-camera-near={0.1}
                shadow-camera-far={light.distance}
                shadow-bias={-0.005}
            />
        </group>
    )
}

/** Renders all placed point lights — supports XZ drag via capture plane */
function PlacedLights({ orbitRef }: { orbitRef: React.RefObject<OrbitControlsImpl | null> }) {
    const placedLights = useStore((s) => s.placedLights)
    const selection = useStore((s) => s.selection)
    const updateLight = useStore((s) => s.updateLight)
    const { camera, gl } = useThree()

    const [draggingId, setDraggingId] = useState<string | null>(null)
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
    const dragRaycaster = useRef(new THREE.Raycaster())
    const dragHit = useRef(new THREE.Vector3())

    const draggingLight = draggingId ? placedLights.find((l) => l.id === draggingId) ?? null : null

    const startDrag = useCallback((light: PlacedLight) => {
        setDraggingId(light.id)
        // Horizontal plane at the light's current height
        dragPlane.current.constant = -light.position[1]
        if (orbitRef.current) orbitRef.current.enabled = false
        gl.domElement.style.cursor = 'grabbing'
    }, [orbitRef, gl])

    const endDrag = useCallback(() => {
        setDraggingId(null)
        if (orbitRef.current) orbitRef.current.enabled = true
        gl.domElement.style.cursor = ''
        // Commit final position to history
        useStore.getState().commitHistory()
    }, [orbitRef, gl])

    return (
        <group>
            {/* Invisible drag-capture plane — only present while dragging */}
            {draggingLight && (
                <mesh
                    position={[0, draggingLight.position[1], 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    onPointerMove={(e) => {
                        e.stopPropagation()
                        dragRaycaster.current.setFromCamera(e.pointer, camera)
                        if (dragRaycaster.current.ray.intersectPlane(dragPlane.current, dragHit.current)) {
                            updateLight(draggingLight.id, {
                                position: [snapToGrid(dragHit.current.x), draggingLight.position[1], snapToGrid(dragHit.current.z)],
                            }, true)
                        }
                    }}
                    onPointerUp={endDrag}
                    onPointerLeave={endDrag}
                >
                    <planeGeometry args={[200, 200]} />
                    <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} colorWrite={false} />
                </mesh>
            )}

            {placedLights.map((light) => (
                <PlacedLightMesh
                    key={light.id}
                    light={light}
                    isSelected={selection?.type === 'light' && selection.id === light.id}
                    onDragStart={() => startDrag(light)}
                />
            ))}
        </group>
    )
}
