'use client'

import { useRef, useEffect, useState, useMemo, useCallback, memo, Suspense } from 'react'
import * as THREE from 'three'
import { useGLTF, useCursor } from '@react-three/drei'
import { ThreeEvent, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useStore } from '@/store/useStore'
import type { PlacedItem, Vec2 } from '@/types'
import { snapToGrid } from '@/utils/grid'
import { isLowPerfDevice as detectLowPerfDevice } from '@/engine/runtime/deviceProfile'
import { clearModelTemplate, getCachedModelUrls, getOrCreateModelTemplate, pruneModelTemplateCache } from '@/engine/assets/modelCache'
import { beginPointerDrag } from '@/engine/runtime/interactions/drag'

// Enable Draco mesh decompression — 5-10x smaller GLB downloads.
// Uses Google-hosted WASM decoder (no need to self-host files).
// Models without Draco compression still load normally.
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

// --- Window geometry constants (matching wall thickness) ---
const WALL_T = 0.114
const WIN_FRAME_W = 0.05
const WIN_FRAME_D = WALL_T * 1.06
const WIN_MULLION_W = 0.035

/**
 * Standalone window geometry, centered at local origin.
 * X = thickness axis, Y = up/down, Z = along wall.
 */
// Shared window materials — avoids creating 7 material instances per window per render
const sharedWindowFrameMat = new THREE.MeshStandardMaterial({ color: '#c9b99a', roughness: 0.65, metalness: 0.05 })
const sharedWindowGlassMat = new THREE.MeshStandardMaterial({
    color: '#b8d4e8', transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0.12,
    side: THREE.DoubleSide, depthWrite: false,
})
// Shared box geometry for all window frame parts
const sharedBoxGeo = new THREE.BoxGeometry(1, 1, 1)

const WindowGeometry = memo(function WindowGeometry({ width, height, opacity = 1, castShadow = true }: { width: number; height: number; opacity?: number; castShadow?: boolean }) {
    const innerW = width - WIN_FRAME_W * 2
    const innerH = height - WIN_FRAME_W * 2
    const isPreview = opacity < 1
    const castFrameShadow = !isPreview && castShadow
    const receiveFrameShadow = !isPreview

    // For previews, use cloned transparent materials; for placed windows, share
    const frameMat = useMemo(() => {
        if (!isPreview) return sharedWindowFrameMat
        const m = sharedWindowFrameMat.clone()
        m.transparent = true
        m.opacity = opacity
        m.color.set('#a09080')
        return m
    }, [isPreview, opacity])

    const glassMat = useMemo(() => {
        if (!isPreview) return sharedWindowGlassMat
        const m = sharedWindowGlassMat.clone()
        m.opacity = opacity * 0.22
        return m
    }, [isPreview, opacity])

    // Suppress SSAO NormalPass on glass so it doesn't render as opaque slab
    const glassRef = useRef<THREE.Mesh>(null)
    useEffect(() => {
        const mesh = glassRef.current
        if (!mesh) return
        mesh.onBeforeRender = (_r, scene) => {
            if (scene.overrideMaterial) {
                scene.overrideMaterial.depthWrite = false
                scene.overrideMaterial.colorWrite = false
            }
        }
        mesh.onAfterRender = (_r, scene) => {
            if (scene.overrideMaterial) {
                scene.overrideMaterial.depthWrite = true
                scene.overrideMaterial.colorWrite = true
            }
        }
        return () => {
            mesh.onBeforeRender = () => { }
            mesh.onAfterRender = () => { }
        }
    }, [])

    return (
        <group>
            {/* Outer frame — top */}
            <mesh geometry={sharedBoxGeo} material={frameMat} position={[0, height / 2 - WIN_FRAME_W / 2, 0]} scale={[WIN_FRAME_D, WIN_FRAME_W, width]} castShadow={castFrameShadow} receiveShadow={receiveFrameShadow} />
            {/* Outer frame — bottom */}
            <mesh geometry={sharedBoxGeo} material={frameMat} position={[0, -height / 2 + WIN_FRAME_W / 2, 0]} scale={[WIN_FRAME_D, WIN_FRAME_W, width]} castShadow={castFrameShadow} receiveShadow={receiveFrameShadow} />
            {/* Outer frame — left */}
            <mesh geometry={sharedBoxGeo} material={frameMat} position={[0, 0, -width / 2 + WIN_FRAME_W / 2]} scale={[WIN_FRAME_D, innerH, WIN_FRAME_W]} castShadow={castFrameShadow} receiveShadow={receiveFrameShadow} />
            {/* Outer frame — right */}
            <mesh geometry={sharedBoxGeo} material={frameMat} position={[0, 0, width / 2 - WIN_FRAME_W / 2]} scale={[WIN_FRAME_D, innerH, WIN_FRAME_W]} castShadow={castFrameShadow} receiveShadow={receiveFrameShadow} />
            {/* Cross — horizontal mullion */}
            <mesh geometry={sharedBoxGeo} material={frameMat} scale={[WIN_FRAME_D * 0.9, WIN_MULLION_W, innerW]} castShadow={castFrameShadow} receiveShadow={receiveFrameShadow} />
            {/* Cross — vertical mullion */}
            <mesh geometry={sharedBoxGeo} material={frameMat} scale={[WIN_FRAME_D * 0.9, innerH, WIN_MULLION_W]} castShadow={castFrameShadow} receiveShadow={receiveFrameShadow} />
            {/* Glass */}
            <mesh ref={glassRef} geometry={sharedBoxGeo} material={glassMat} scale={[0.006, innerH, innerW]} receiveShadow={false} castShadow={false} />
        </group>
    )
})

/** A placed window item — rendered as geometry on the wall face, draggable along the wall. */
const SceneWindowItem = memo(function SceneWindowItem({ item, isSelected, onClick, castShadow = true }: { item: PlacedItem; isSelected: boolean; onClick?: () => void; castShadow?: boolean }) {
    const activeTool = useStore((s) => s.activeTool)
    const roomPolygons = useStore((s) => s.roomPolygons)
    const updateWindowPlacement = useStore((s) => s.updateWindowPlacement)
    const { controls, gl, camera } = useThree()
    const [hovered, setHovered] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    useCursor((hovered || isDragging) && activeTool === 'select', isDragging ? 'grabbing' : 'grab')

    const w = item.windowSize?.width ?? 1.2
    const h = item.windowSize?.height ?? 1.2

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (activeTool !== 'select') return
        e.stopPropagation()

        // First click just selects
        if (!isSelected) {
            if (onClick) onClick()
            return
        }

        if (!item.wallRef) return
        const poly = roomPolygons.find((p) => p.id === item.wallRef!.polygonId)
        if (!poly) return

        // Build segment pairs to find p1/p2
        const pts = poly.points
        const pairs: [Vec2, Vec2][] = []
        for (let i = 0; i < pts.length - 1; i++) pairs.push([pts[i], pts[i + 1]])
        if (poly.closed) pairs.push([pts[pts.length - 1], pts[0]])
        const pair = pairs[item.wallRef.segmentIndex]
        if (!pair) return

        const [p1, p2] = pair
        const dx = p2.x - p1.x, dz = p2.z - p1.z
        const segLen = Math.sqrt(dx * dx + dz * dz)
        if (segLen === 0) return

        useStore.getState().commitHistory()
        setIsDragging(true)
        setOrbitEnabled(controls, false)

        // Reuse pre-allocated objects — set plane height for this drag session
        _dragPlane.constant = -item.position[1]
        const canvas = gl.domElement
        const halfMargin = (w / 2) / segLen + 0.01

        const onMove = (ev: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            _dragNdc.set(
                ((ev.clientX - rect.left) / rect.width) * 2 - 1,
                -((ev.clientY - rect.top) / rect.height) * 2 + 1,
            )
            _dragRaycaster.setFromCamera(_dragNdc, camera)
            if (_dragRaycaster.ray.intersectPlane(_dragPlane, _dragHit)) {
                const dot = (_dragHit.x - p1.x) * (dx / segLen) + (_dragHit.z - p1.z) * (dz / segLen)
                const t = Math.max(halfMargin, Math.min(1 - halfMargin, dot / segLen))
                updateWindowPlacement(item.id, t, true)
            }
        }

        const onUp = () => {
            setIsDragging(false)
            setOrbitEnabled(controls, true)
            useStore.getState().commitHistory()
        }

        beginPointerDrag({ canvas, onMove, onEnd: onUp })
    }

    return (
        <group position={item.position} rotation={item.rotation}>
            <WindowGeometry width={w} height={h} castShadow={castShadow} />

            {/* Hit target — wider than glass so easier to click/grab */}
            {activeTool === 'select' && (
                <mesh
                    onPointerDown={handlePointerDown}
                    onPointerOver={() => setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                >
                    <boxGeometry args={[WIN_FRAME_D * 3, h, w]} />
                    <meshBasicMaterial visible={false} depthWrite={false} />
                </mesh>
            )}

            {/* Selection ring */}
            {isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -h / 2 + 0.01, 0]}>
                    <ringGeometry args={[Math.max(w, h) / 2 + 0.05, Math.max(w, h) / 2 + 0.18, 48]} />
                    <meshBasicMaterial color="#6366f1" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
            )}
        </group>
    )
})

/** Preview window shown while dragging a window item over a wall. */
function WindowDragPreview() {
    const dragWindowHit = useStore((s) => s.dragWindowHit)
    const draggedLibraryItem = useStore((s) => s.draggedLibraryItem)

    if (!dragWindowHit || !draggedLibraryItem?.isWindow) return null
    const { worldPosition, wallAngle, windowSize } = dragWindowHit

    return (
        <group position={worldPosition} rotation={[0, wallAngle, 0]}>
            <WindowGeometry width={windowSize.width} height={windowSize.height} opacity={0.55} />
        </group>
    )
}

const MODEL_TEMPLATE_CACHE_LIMIT = 36
const MODEL_UNLOAD_DELAY_MS = 15000

// Pre-allocated objects for drag raycasting — avoids GC pressure during pointermove
const _dragRaycaster = new THREE.Raycaster()
const _dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _dragHit = new THREE.Vector3()
const _dragNdc = new THREE.Vector2()

function setOrbitEnabled(controls: unknown, enabled: boolean) {
    const orbit = controls as OrbitControlsImpl | null | undefined
    if (!orbit) return
    orbit.enabled = enabled
}

interface SceneModelProps {
    item: PlacedItem
    isSelected: boolean
    onClick?: () => void
    interactive?: boolean
    castShadow?: boolean
    onReady?: (id: string) => void
}

const SceneModel = memo(function SceneModel({ item, isSelected, onClick, interactive = true, castShadow = false, onReady }: SceneModelProps) {
    const { scene } = useGLTF(item.modelUrl)
    const updateItemDimensions = useStore((s) => s.updateItemDimensions)
    const updateItemPosition = useStore((s) => s.updateItemPosition)
    const activeTool = useStore((s) => s.activeTool)
    const { controls, gl, camera, invalidate } = useThree()

    const [isDragging, setIsDragging] = useState(false)
    const [hovered, setHovered] = useState(false)
    const groupRef = useRef<THREE.Group>(null)
    const dragPosRef = useRef<[number, number, number]>(item.position)

    // Keep group in sync when position changes externally (not during active drag)
    useEffect(() => {
        dragPosRef.current = item.position
        if (!isDragging && groupRef.current) {
            groupRef.current.position.set(item.position[0], item.position[1], item.position[2])
        }
    }, [item.position, isDragging])

    useCursor((hovered || isDragging) && interactive && activeTool === 'select', isDragging ? 'grabbing' : 'grab', 'auto')

    const modelTemplate = useMemo(() => getOrCreateModelTemplate(item.modelUrl, scene), [item.modelUrl, scene])
    const normalizedScene = useMemo(() => {
        const clone = modelTemplate.template.clone(true)
        clone.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return
            const mesh = child as THREE.Mesh
            mesh.castShadow = castShadow
            mesh.receiveShadow = false
        })
        return clone
    }, [modelTemplate, castShadow])

    useEffect(() => {
        // Only show transparency for drag previews (non-interactive), not for selected items
        const shouldBeTransparent = !interactive && !item.isGenerated
        if (!shouldBeTransparent) return

        // Clone materials for this preview instance so we don't mutate shared materials
        const clonedMats: THREE.Material[] = []
        normalizedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(m => {
                        const c = m.clone()
                        c.transparent = true
                        c.opacity = 0.4
                        c.needsUpdate = true
                        clonedMats.push(c)
                        return c
                    })
                } else {
                    const c = mesh.material.clone()
                    c.transparent = true
                    c.opacity = 0.4
                    c.needsUpdate = true
                    clonedMats.push(c)
                    mesh.material = c
                }
            }
        })
        return () => { clonedMats.forEach(m => m.dispose()) }
    }, [normalizedScene, interactive, item.isGenerated])

    useEffect(() => {
        const base = modelTemplate.dimensions
        const dims: [number, number, number] = [base[0] * item.scale, base[1] * item.scale, base[2] * item.scale]

        if (
            !item.dimensions ||
            Math.abs(item.dimensions[0] - dims[0]) > 0.001 ||
            Math.abs(item.dimensions[1] - dims[1]) > 0.001 ||
            Math.abs(item.dimensions[2] - dims[2]) > 0.001
        ) {
            updateItemDimensions(item.id, dims)
        }
    }, [modelTemplate, item.scale, item.id, item.dimensions, updateItemDimensions])

    useEffect(() => {
        onReady?.(item.id)
    }, [item.id, onReady])

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (!interactive) return
        if (activeTool !== 'select') return
        e.stopPropagation()

        if (!isSelected) {
            if (onClick) onClick()
            return
        }

        useStore.getState().commitHistory()
        dragPosRef.current = item.position
        setIsDragging(true)
        setOrbitEnabled(controls, false)

        // Reuse pre-allocated objects — reset plane to ground level
        _dragPlane.constant = 0
        const canvas = gl.domElement

        const onMove = (ev: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            _dragNdc.set(
                ((ev.clientX - rect.left) / rect.width) * 2 - 1,
                -((ev.clientY - rect.top) / rect.height) * 2 + 1,
            )
            _dragRaycaster.setFromCamera(_dragNdc, camera)
            if (_dragRaycaster.ray.intersectPlane(_dragPlane, _dragHit)) {
                const newX = snapToGrid(_dragHit.x)
                const newZ = snapToGrid(_dragHit.z)
                if (newX !== dragPosRef.current[0] || newZ !== dragPosRef.current[2]) {
                    dragPosRef.current = [newX, dragPosRef.current[1], newZ]
                    if (groupRef.current) {
                        groupRef.current.position.set(newX, dragPosRef.current[1], newZ)
                    }
                    invalidate()
                }
            }
        }

        const onUp = () => {
            setIsDragging(false)
            setOrbitEnabled(controls, true)
            updateItemPosition(item.id, dragPosRef.current, true)
        }

        beginPointerDrag({ canvas, onMove, onEnd: onUp })
    }

    const selectionRingRadius = item.dimensions
        ? Math.max(item.dimensions[0], item.dimensions[2]) / 2 + 0.15
        : 1.0

    const hitDimensions = item.dimensions || [1, 1, 1]

    return (
        <group ref={groupRef} position={item.position}>
            {/* Visual model — disable raycasting so only the hit target mesh captures events */}
            <group rotation={item.rotation} scale={item.scale}>
                <primitive object={normalizedScene} raycast={null} />
            </group>

            {/* Invisible bounding-box hit target: 12 triangles vs potentially thousands of GLTF tris */}
            {interactive && activeTool === 'select' && (
                <mesh
                    rotation={item.rotation}
                    position={[0, hitDimensions[1] / 2, 0]}
                    onPointerDown={handlePointerDown}
                    onPointerOver={() => setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                >
                    <boxGeometry args={hitDimensions} />
                    <meshBasicMaterial visible={false} depthWrite={false} />
                </mesh>
            )}

            {isSelected && interactive && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                    <ringGeometry args={[selectionRingRadius - 0.05, selectionRingRadius, 40]} />
                    <meshBasicMaterial color="#6366f1" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
            )}
        </group>
    )
})

function DragPreview() {
    const draggedLibraryItem = useStore((s) => s.draggedLibraryItem)
    const dragHoverPoint = useStore((s) => s.dragHoverPoint)

    // Window drag preview is handled by WindowDragPreview
    if (!draggedLibraryItem || draggedLibraryItem.isWindow) return null
    if (!dragHoverPoint) return null

    const fakeItem: PlacedItem = {
        id: 'preview',
        name: draggedLibraryItem.name,
        modelUrl: draggedLibraryItem.modelUrl,
        position: dragHoverPoint,
        rotation: [0, 0, 0],
        scale: 1,
        isGenerated: draggedLibraryItem.category === 'Generated'
    }

    return (
        <Suspense fallback={null}>
            <SceneModel item={fakeItem} isSelected={true} interactive={false} />
        </Suspense>
    )
}

export function SceneItems({ readonly = false }: { readonly?: boolean }) {
    const placedItems = useStore((s) => s.placedItems)
    const placedLights = useStore((s) => s.placedLights)
    const draggedLibraryItem = useStore((s) => s.draggedLibraryItem)
    const selection = useStore((s) => s.selection)
    const setSelection = useStore((s) => s.setSelection)
    const activeTool = useStore((s) => s.activeTool)
    const shadowsEnabled = useStore((s) => s.shadowsEnabled)
    const setIsLoading = useStore((s) => s.setIsLoading)
    const unloadTimersRef = useRef<Map<string, number>>(new Map())
    const activeModelUrlsRef = useRef<Set<string>>(new Set())
    const readyModelIdsRef = useRef<Set<string>>(new Set())
    const [readyModelsVersion, setReadyModelsVersion] = useState(0)

    const [isLowPerfDevice] = useState(detectLowPerfDevice)

    const modelItems = useMemo(() => placedItems.filter((it) => !it.isWindow), [placedItems])

    const handleModelReady = useCallback((id: string) => {
        if (readyModelIdsRef.current.has(id)) return
        readyModelIdsRef.current.add(id)
        setReadyModelsVersion((v) => v + 1)
    }, [])

    useEffect(() => {
        if (modelItems.length === 0) {
            setIsLoading(false)
            return
        }
        for (const item of modelItems) {
            if (!readyModelIdsRef.current.has(item.id)) return
        }
        setIsLoading(false)
    }, [modelItems, readyModelsVersion, setIsLoading])
    const activeModelUrls = useMemo(() => {
        const urls = new Set<string>()
        for (const item of modelItems) {
            if (item.modelUrl) urls.add(item.modelUrl)
        }
        if (draggedLibraryItem && !draggedLibraryItem.isWindow && draggedLibraryItem.modelUrl) {
            urls.add(draggedLibraryItem.modelUrl)
        }
        return urls
    }, [modelItems, draggedLibraryItem])

    useEffect(() => {
        activeModelUrlsRef.current = activeModelUrls
    }, [activeModelUrls])

    useEffect(() => {
        pruneModelTemplateCache(activeModelUrls, MODEL_TEMPLATE_CACHE_LIMIT)

        for (const [url, timerId] of unloadTimersRef.current.entries()) {
            if (activeModelUrls.has(url)) {
                window.clearTimeout(timerId)
                unloadTimersRef.current.delete(url)
            }
        }

        for (const url of getCachedModelUrls()) {
            if (activeModelUrls.has(url)) continue
            if (unloadTimersRef.current.has(url)) continue
            const timerId = window.setTimeout(() => {
                unloadTimersRef.current.delete(url)
                if (activeModelUrlsRef.current.has(url)) return
                clearModelTemplate(url)
                useGLTF.clear(url)
            }, MODEL_UNLOAD_DELAY_MS)
            unloadTimersRef.current.set(url, timerId)
        }
    }, [activeModelUrls])

    useEffect(() => {
        const timers = unloadTimersRef.current
        return () => {
            for (const timerId of timers.values()) {
                window.clearTimeout(timerId)
            }
            timers.clear()
        }
    }, [])

    const modelShadowCasterIds = useMemo(() => {
        const max = isLowPerfDevice ? 1 : 2
        const ids: string[] = []
        if (selection?.type === 'item' && modelItems.some((it) => it.id === selection.id)) {
            ids.push(selection.id)
        }
        for (const it of modelItems) {
            if (ids.length >= max) break
            if (!ids.includes(it.id)) ids.push(it.id)
        }
        return new Set(ids)
    }, [isLowPerfDevice, selection, modelItems])

    const shadowCastingLights = useMemo(() => {
        if (!shadowsEnabled || placedLights.length === 0) return []
        const max = isLowPerfDevice ? 1 : 2
        const ids: string[] = []

        if (selection?.type === 'light' && placedLights.some((l) => l.id === selection.id)) {
            ids.push(selection.id)
        }

        for (const light of placedLights) {
            if (ids.length >= max) break
            if (!ids.includes(light.id)) ids.push(light.id)
        }

        return placedLights.filter((light) => ids.includes(light.id))
    }, [shadowsEnabled, placedLights, isLowPerfDevice, selection])

    const windowShadowCasterIds = useMemo(() => {
        if (shadowCastingLights.length === 0) return new Set<string>()

        const ids = new Set<string>()
        for (const item of placedItems) {
            if (!item.isWindow) continue
            const width = item.windowSize?.width ?? 1.2
            const height = item.windowSize?.height ?? 1.2
            const halfW = width * 0.5
            const halfH = height * 0.5
            const halfD = WIN_FRAME_D * 0.5
            const yaw = item.rotation[1] ?? 0
            const alongX = Math.sin(yaw)
            const alongZ = Math.cos(yaw)
            const normalX = Math.cos(yaw)
            const normalZ = -Math.sin(yaw)

            for (const light of shadowCastingLights) {
                const dx = light.position[0] - item.position[0]
                const dy = light.position[1] - item.position[1]
                const dz = light.position[2] - item.position[2]

                // Light-to-window OBB distance in window-local axes.
                const localAlong = dx * alongX + dz * alongZ
                const localUp = dy
                const localNormal = dx * normalX + dz * normalZ

                const clampedAlong = Math.max(-halfW, Math.min(halfW, localAlong))
                const clampedUp = Math.max(-halfH, Math.min(halfH, localUp))
                const clampedNormal = Math.max(-halfD, Math.min(halfD, localNormal))

                const distToWindow = Math.hypot(
                    localAlong - clampedAlong,
                    localUp - clampedUp,
                    localNormal - clampedNormal,
                )

                if (distToWindow <= light.distance) {
                    ids.add(item.id)
                    break
                }
            }
        }

        return ids
    }, [placedItems, shadowCastingLights])

    const handleSelect = (id: string) => {
        if (activeTool === 'select' && !readonly) {
            setSelection({ type: 'item', id })
        }
    }

    return (
        <group>
            {placedItems.map((item) => {
                const isSelected = selection?.type === 'item' && item.id === selection.id

                if (item.isWindow) {
                    return (
                        <SceneWindowItem
                            key={item.id}
                            item={item}
                            isSelected={isSelected}
                            onClick={() => handleSelect(item.id)}
                            castShadow={windowShadowCasterIds.has(item.id)}
                        />
                    )
                }

                return (
                        <Suspense key={item.id} fallback={null}>
                            <SceneModel
                                item={item}
                                isSelected={isSelected}
                                onClick={() => handleSelect(item.id)}
                                interactive={!readonly}
                                castShadow={modelShadowCasterIds.has(item.id)}
                                onReady={handleModelReady}
                            />
                        </Suspense>
                    )
            })}

            {!readonly && <DragPreview />}
            {!readonly && <WindowDragPreview />}
        </group>
    )
}
