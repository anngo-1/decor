'use client'

import { Suspense, useCallback, useEffect, useRef } from 'react'
import { Canvas, useThree, ThreeEvent, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, PerspectiveCamera, PointerLockControls, AdaptiveDpr, AdaptiveEvents, Bvh } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { SceneItems } from './SceneItems'
import { WallSystem, WallPreview } from './WallSystem'
import { SceneLoader } from './SceneLoader'
import { useStore } from '@/store/useStore'
import { GridHelper } from './GridHelper'
import type { Vec2 } from '@/types'

/** Syncs renderer shadow map with the store toggle each frame. */
function ShadowToggle({ readonly }: { readonly: boolean }) {
    const shadowsEnabled = useStore((s) => s.shadowsEnabled)
    const { gl } = useThree()
    useEffect(() => {
        const shadowMap = gl.shadowMap
        // eslint-disable-next-line react-hooks/immutability
        shadowMap.enabled = shadowsEnabled
        shadowMap.needsUpdate = true
        // Only allow real-time updates if NOT readonly for better scroll performance
        if (shadowMap.enabled && readonly) {
            shadowMap.autoUpdate = false
        } else {
            shadowMap.autoUpdate = true
        }
    }, [shadowsEnabled, gl, readonly])
    return null
}

/** Captures screenshots from the renderer and registers them in the store. */
function ScreenshotManager() {
    const { gl, scene, camera } = useThree()
    const setGetScreenshot = useStore((s) => s.setGetScreenshot)

    useEffect(() => {
        const getScreenshot = () => {
            const originalBackground = scene.background

            scene.background = new THREE.Color('#fcfaff')
            gl.render(scene, camera)

            const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.8)

            scene.background = originalBackground

            return dataUrl
        }
        setGetScreenshot(getScreenshot)
        return () => setGetScreenshot(null)
    }, [gl, scene, camera, setGetScreenshot])

    return null
}

// 0.5 m snap — matches the GridHelper's 0.5 m cell size (size=30, divisions=60)
export const SNAP = 0.5

export function snapToGrid(v: number): number {
    return Math.round(v / SNAP) * SNAP
}

function snapPoint(x: number, z: number, shiftHeld: boolean, lastPoint: Vec2 | null): Vec2 {
    const sx = snapToGrid(x)
    const sz = snapToGrid(z)
    if (!shiftHeld || !lastPoint) return { x: sx, z: sz }

    // Axis-lock: constrain to the dominant axis from the last placed point
    const dx = Math.abs(sx - lastPoint.x)
    const dz = Math.abs(sz - lastPoint.z)
    return dx >= dz
        ? { x: sx, z: lastPoint.z } // horizontal
        : { x: lastPoint.x, z: sz } // vertical
}

/** Attaches native drag-drop events to the gl.domElement canvas for furniture placement. */
function DragDropHandler() {
    const { camera, gl } = useThree()
    const draggedLibraryItem = useStore((s) => s.draggedLibraryItem)
    const placeItem = useStore((s) => s.placeItem)
    const setDraggedLibraryItem = useStore((s) => s.setDraggedLibraryItem)
    const setDragHoverPoint = useStore((s) => s.setDragHoverPoint)

    const stateRef = useRef({ draggedLibraryItem, placeItem, setDraggedLibraryItem, setDragHoverPoint, camera })
    useEffect(() => {
        stateRef.current = { draggedLibraryItem, placeItem, setDraggedLibraryItem, setDragHoverPoint, camera }
    })

    useEffect(() => {
        const canvas = gl.domElement
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

        const onDragOver = (e: DragEvent) => {
            e.preventDefault()
            const { draggedLibraryItem, camera, setDragHoverPoint } = stateRef.current
            if (!draggedLibraryItem) return

            const rect = canvas.getBoundingClientRect()
            const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
            const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1

            const raycaster = new THREE.Raycaster()
            raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
            const hit = new THREE.Vector3()
            if (raycaster.ray.intersectPlane(groundPlane, hit)) {
                setDragHoverPoint([snapToGrid(hit.x), 0, snapToGrid(hit.z)])
            }
        }

        const onDragLeave = () => {
            stateRef.current.setDragHoverPoint(null)
        }

        const onDrop = (e: DragEvent) => {
            e.preventDefault()
            const { draggedLibraryItem, placeItem, setDraggedLibraryItem, setDragHoverPoint, camera } = stateRef.current
            if (!draggedLibraryItem) return

            const rect = canvas.getBoundingClientRect()
            const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
            const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1

            const raycaster = new THREE.Raycaster()
            raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
            const hit = new THREE.Vector3()
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
    const setHoverPoint = useStore((s) => s.setHoverPoint)

    // Track pointer position at mousedown so we can ignore drags
    const downPos = useRef<{ x: number; y: number } | null>(null)
    const DRAG_THRESHOLD_PX = 5

    const active = activeTool === 'wall' && isDrawingWall

    const handlePointerMove = useCallback(
        (e: ThreeEvent<PointerEvent>) => {
            if (!active) return
            const pt = snapPoint(e.point.x, e.point.z, e.shiftKey, currentWallPoints.at(-1) ?? null)
            setHoverPoint(pt)
        },
        [active, currentWallPoints, setHoverPoint]
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
            const pt = snapPoint(e.point.x, e.point.z, e.shiftKey, currentWallPoints.at(-1) ?? null)

            // If we already have 1 point, this click completes the segment
            if (currentWallPoints.length === 1) {
                useStore.getState().addWallSegment([...currentWallPoints, pt])
                return
            }

            addWallPoint(pt)
        },
        [active, currentWallPoints, addWallPoint]
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
            <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
    )
}

/**
 * Intercepts wheel events on the canvas.
 * If ctrlKey is false, it's a scroll wheel event (not a pinch/zoom).
 * In this case, we stop propagation so OrbitControls doesn't zoom.
 */
function WheelHandler() {
    const { gl } = useThree()

    useEffect(() => {
        const canvas = gl.domElement
        const onWheel = (e: WheelEvent) => {
            // On Mac trackpads, pinch-to-zoom sets ctrlKey: true
            // Basic scroll wheel does not. If no ctrlKey, it's a scroll.
            if (!e.ctrlKey) {
                // Let the browser/parent scroll the feed instead of zooming
                e.stopImmediatePropagation()
            }
        }

        // Must be non-passive to allow stopImmediatePropagation to block OrbitControls
        canvas.addEventListener('wheel', onWheel, { capture: true, passive: false })
        return () => canvas.removeEventListener('wheel', onWheel, { capture: true })
    }, [gl])

    return null
}

export function RoomCanvas({ readonly = false }: { readonly?: boolean }) {
    const selectItem = useStore((s) => s.selectItem)
    const activeTool = useStore((s) => s.activeTool)
    const shadowsEnabled = useStore((s) => s.shadowsEnabled)
    const orbitRef = useRef<OrbitControlsImpl | null>(null)
    const selectWall = useStore((s) => s.selectWall)
    const isPointerLocked = useStore((s) => s.isPointerLocked)

    return (
        <Canvas
            shadows
            dpr={[1, 2]}
            performance={{ min: 0.5 }}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                preserveDrawingBuffer: true
            }}
            style={{ background: '#fcfaff' }}
            onPointerMissed={() => {
                if (activeTool === 'select') {
                    selectItem(null)
                    selectWall(null)
                }
            }}
        >
            <PerspectiveCamera makeDefault position={[0, 12, 14]} fov={50} />

            <SceneLoader />
            <ShadowToggle readonly={readonly} />
            <DragDropHandler />
            <ScreenshotManager />

            <ambientLight intensity={0.4} />
            <directionalLight
                position={[10, 15, 10]}
                intensity={1.5}
                castShadow={shadowsEnabled}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={50}
                shadow-camera-near={0.1}
                shadow-camera-left={-15}
                shadow-camera-right={15}
                shadow-camera-top={15}
                shadow-camera-bottom={-15}
            />
            <pointLight position={[-8, 8, -8]} intensity={0.5} color="#a0c4ff" />

            {!readonly && <GridHelper />}

            <Bvh firstHitOnly>
                <WallSystem readonly={readonly} />
                {!readonly && <WallPreview />}
                <SceneItems readonly={readonly} />
            </Bvh>

            <AdaptiveDpr pixelated />
            <AdaptiveEvents />

            {shadowsEnabled && (
                <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={30} blur={2} far={4} />
            )}
            {!readonly && <WallInteractionPlane />}

            <OrbitControls
                ref={orbitRef}
                enabled={!isPointerLocked}
                enableDamping
                dampingFactor={0.05}
                minDistance={2}
                maxDistance={40}
                maxPolarAngle={Math.PI / 2.1}
            />

            {readonly && <WheelHandler />}

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
                const dir = new THREE.Vector3()
                camera.getWorldDirection(dir)
                orbitRef.current.target.copy(camera.position).add(dir.multiplyScalar(10))
                orbitRef.current.update()
            }
            return
        }

        const SPEED = 8 // m/s
        const velocity = new THREE.Vector3()

        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()

        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

        if (k.has('w')) velocity.addScaledVector(forward, SPEED * delta)
        if (k.has('s')) velocity.addScaledVector(forward, -SPEED * delta)
        if (k.has('a')) velocity.addScaledVector(right, -SPEED * delta)
        if (k.has('d')) velocity.addScaledVector(right, SPEED * delta)
        if (k.has(' ')) velocity.y += SPEED * delta
        if (k.has('q')) velocity.y -= SPEED * delta

        if (velocity.lengthSq() > 0) {
            camera.position.add(velocity)
            // Prevent going below ground
            // eslint-disable-next-line react-hooks/immutability
            if (camera.position.y < 0.5) camera.position.y = 0.5

            if (!isPointerLocked && orbitRef.current) {
                // In Orbit mode, moving camera also moves the focal point to maintain rig stability
                orbitRef.current.target.add(velocity)
                orbitRef.current.update()
            }
        }

        if (isPointerLocked && orbitRef.current) {
            // Keep target tethered in front of camera while moving in lock mode
            const dir = new THREE.Vector3()
            camera.getWorldDirection(dir)
            orbitRef.current.target.copy(camera.position).add(dir.multiplyScalar(10))
            orbitRef.current.update()
        }
    })

    return null
}

