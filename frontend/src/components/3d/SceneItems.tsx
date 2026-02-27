'use client'

import { useRef, useEffect, useState, useMemo, memo, Suspense } from 'react'
import * as THREE from 'three'
import { useGLTF, useCursor } from '@react-three/drei'
import { ThreeEvent, useThree } from '@react-three/fiber'
import { useStore } from '@/store/useStore'
import type { PlacedItem, Vec2 } from '@/types'
import { snapToGrid } from '@/utils/grid'

// --- Window geometry constants (matching wall thickness) ---
const WALL_T = 0.114
const WIN_FRAME_W = 0.05
const WIN_FRAME_D = WALL_T * 1.06
const WIN_MULLION_W = 0.035

/**
 * Standalone window geometry, centered at local origin.
 * X = thickness axis, Y = up/down, Z = along wall.
 */
function WindowGeometry({ width, height, opacity = 1 }: { width: number; height: number; opacity?: number }) {
    const innerW = width - WIN_FRAME_W * 2
    const innerH = height - WIN_FRAME_W * 2
    const frameColor = opacity < 1 ? '#a09080' : '#c9b99a'
    const transparent = opacity < 1

    // The glass has depthWrite=false so objects behind it (grid, lights) render
    // correctly. But the SSAO NormalPass overrides all materials with
    // MeshNormalMaterial which defaults to depthWrite=true, making the glass
    // appear as a solid opaque slab and turning black under SSAO.
    // Fix: suppress depth+color writes on the override material for this mesh
    // only, so the NormalPass treats the glass as non-existent.
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
            <mesh position={[0, height / 2 - WIN_FRAME_W / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[WIN_FRAME_D, WIN_FRAME_W, width]} />
                <meshStandardMaterial color={frameColor} roughness={0.65} metalness={0.05} transparent={transparent} opacity={opacity} />
            </mesh>
            {/* Outer frame — bottom */}
            <mesh position={[0, -height / 2 + WIN_FRAME_W / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[WIN_FRAME_D, WIN_FRAME_W, width]} />
                <meshStandardMaterial color={frameColor} roughness={0.65} metalness={0.05} transparent={transparent} opacity={opacity} />
            </mesh>
            {/* Outer frame — left */}
            <mesh position={[0, 0, -width / 2 + WIN_FRAME_W / 2]} castShadow receiveShadow>
                <boxGeometry args={[WIN_FRAME_D, innerH, WIN_FRAME_W]} />
                <meshStandardMaterial color={frameColor} roughness={0.65} metalness={0.05} transparent={transparent} opacity={opacity} />
            </mesh>
            {/* Outer frame — right */}
            <mesh position={[0, 0, width / 2 - WIN_FRAME_W / 2]} castShadow receiveShadow>
                <boxGeometry args={[WIN_FRAME_D, innerH, WIN_FRAME_W]} />
                <meshStandardMaterial color={frameColor} roughness={0.65} metalness={0.05} transparent={transparent} opacity={opacity} />
            </mesh>
            {/* Cross — horizontal mullion */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[WIN_FRAME_D * 0.9, WIN_MULLION_W, innerW]} />
                <meshStandardMaterial color={frameColor} roughness={0.65} metalness={0.05} transparent={transparent} opacity={opacity} />
            </mesh>
            {/* Cross — vertical mullion */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[WIN_FRAME_D * 0.9, innerH, WIN_MULLION_W]} />
                <meshStandardMaterial color={frameColor} roughness={0.65} metalness={0.05} transparent={transparent} opacity={opacity} />
            </mesh>
            {/* Glass — depthWrite=false so geometry behind it still renders.
                The ref+callbacks above prevent SSAO NormalPass from seeing this
                as an opaque solid. */}
            <mesh ref={glassRef} castShadow={false} receiveShadow={false}>
                <boxGeometry args={[0.006, innerH, innerW]} />
                <meshStandardMaterial
                    color="#b8d4e8"
                    transparent
                    opacity={opacity * 0.22}
                    roughness={0.04}
                    metalness={0.12}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
        </group>
    )
}

/** A placed window item — rendered as geometry on the wall face, draggable along the wall. */
function SceneWindowItem({ item, isSelected, onClick }: { item: PlacedItem; isSelected: boolean; onClick?: () => void }) {
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
        if (controls) (controls as any).enabled = false

        const raycaster = new THREE.Raycaster()
        // Horizontal plane at window center height — project mouse onto it, then onto wall axis
        const hitPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -item.position[1])
        const hitVec = new THREE.Vector3()
        const canvas = gl.domElement
        const halfMargin = (w / 2) / segLen + 0.01

        const onMove = (ev: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            const ndcX = ((ev.clientX - rect.left) / rect.width) * 2 - 1
            const ndcY = -((ev.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
            if (raycaster.ray.intersectPlane(hitPlane, hitVec)) {
                const dot = (hitVec.x - p1.x) * (dx / segLen) + (hitVec.z - p1.z) * (dz / segLen)
                const t = Math.max(halfMargin, Math.min(1 - halfMargin, dot / segLen))
                updateWindowPlacement(item.id, t, true)
            }
        }

        const onUp = () => {
            setIsDragging(false)
            if (controls) (controls as any).enabled = true
            useStore.getState().commitHistory()
            canvas.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
        }

        canvas.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
    }

    return (
        <group position={item.position} rotation={item.rotation}>
            <WindowGeometry width={w} height={h} />

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
}

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

const TARGET_SIZE = 1.5

const _box = new THREE.Box3()
const _v1 = new THREE.Vector3()

// Global cache to share converted MeshStandardMaterials across all instances of the same model
const materialCache = new Map<string, THREE.Material>()

// Helper to compute a bounding box from actual visible meshes
function getActualBoundingBox(object: THREE.Object3D): THREE.Box3 | null {
    const meshBoxes: THREE.Box3[] = []
    
    object.updateMatrixWorld(true)
    
    object.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (mesh.isMesh && mesh.geometry && mesh.visible) {
            mesh.geometry.computeBoundingBox()
            const geomBox = mesh.geometry.boundingBox
            if (geomBox) {
                const worldBox = geomBox.clone()
                worldBox.applyMatrix4(mesh.matrixWorld)
                meshBoxes.push(worldBox)
            }
        }
    })
    
    if (meshBoxes.length === 0) return null
    
    const combinedBox = new THREE.Box3()
    for (const box of meshBoxes) {
        combinedBox.union(box)
    }
    return combinedBox
}

// Compute tighter bounding box from actual meshes only, ignoring empty group nodes
function computeTightBounds(object: THREE.Object3D, targetSize = TARGET_SIZE) {
    const combinedBox = getActualBoundingBox(object)
    if (!combinedBox) return null
    
    const size = combinedBox.getSize(_v1)
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim === 0) return null
    
    const scaleFactor = targetSize / maxDim
    const center = combinedBox.getCenter(_v1)
    
    return { scale: scaleFactor, centerX: center.x, centerZ: center.z, minY: combinedBox.min.y }
}

function normalizeBoundingBox(object: THREE.Object3D, targetSize = TARGET_SIZE) {
    const tight = computeTightBounds(object, targetSize)
    if (!tight) return
    
    object.scale.setScalar(tight.scale)
    object.position.x -= tight.centerX
    object.position.z -= tight.centerZ
    object.position.y -= tight.minY
}

interface SceneModelProps {
    item: PlacedItem
    isSelected: boolean
    onClick?: () => void
    interactive?: boolean
}

const SceneModel = memo(function SceneModel({ item, isSelected, onClick, interactive = true }: SceneModelProps) {
    const { scene } = useGLTF(item.modelUrl)
    const updateItemDimensions = useStore((s) => s.updateItemDimensions)
    const updateItemPosition = useStore((s) => s.updateItemPosition)
    const activeTool = useStore((s) => s.activeTool)
    const { controls, gl, camera } = useThree()

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

    useCursor((hovered || isDragging) && interactive && activeTool === 'select', (isDragging ? 'grabbing' : 'grab') as any, 'auto')

    const normalizedScene = useMemo(() => {
        const clone = scene.clone()
        clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                mesh.castShadow = true
                mesh.receiveShadow = true
                if (mesh.material) {
                    const convertMaterial = (m: THREE.Material) => {
                        // Check cache first using the original material's UUID
                        if (materialCache.has(m.uuid)) {
                            return materialCache.get(m.uuid)!
                        }

                        let newMat = m.clone()
                        if ((newMat as any).type === 'MeshBasicMaterial') {
                            const basic = newMat as THREE.MeshBasicMaterial
                            const standard = new THREE.MeshStandardMaterial({
                                color: basic.color,
                                map: basic.map,
                                transparent: basic.transparent,
                                opacity: basic.opacity,
                                side: basic.side,
                                alphaTest: basic.alphaTest,
                                roughness: 0.8,
                                metalness: 0.05,
                            })
                            // Copy vertex colors if they exist
                            if (basic.vertexColors) {
                                standard.vertexColors = basic.vertexColors
                            }
                            newMat = standard
                        }
                        materialCache.set(m.uuid, newMat)
                        return newMat
                    }

                    if (Array.isArray(mesh.material)) {
                        mesh.material = mesh.material.map(m => convertMaterial(m).clone())
                    } else {
                        mesh.material = convertMaterial(mesh.material).clone()
                    }

                    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
                    mats.forEach(matClone => {
                        matClone.userData.originalTransparent = matClone.transparent
                        matClone.userData.originalOpacity = matClone.opacity
                        matClone.needsUpdate = true
                    })
                }
            }
        })

        // Normalize all items to fit within TARGET_SIZE for consistent hitboxes
        normalizeBoundingBox(clone, TARGET_SIZE)

        return clone
    }, [scene, item.isGenerated])

    useEffect(() => {
        // Only show transparency for drag previews (non-interactive), not for selected items
        const shouldBeTransparent = !interactive && !item.isGenerated
        normalizedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material as THREE.Material]

                mats.forEach(mat => {
                    if (!mat) return
                    const targetTransparent = shouldBeTransparent ? true : (mat.userData.originalTransparent ?? false)
                    const targetOpacity = shouldBeTransparent ? 0.4 : (mat.userData.originalOpacity ?? 1.0)

                    if (mat.transparent !== targetTransparent || mat.opacity !== targetOpacity) {
                        mat.transparent = targetTransparent
                        mat.opacity = targetOpacity
                        mat.needsUpdate = true
                    }
                })
            }
        })
    }, [normalizedScene, interactive, item.isGenerated])

    useEffect(() => {
        // Calculate tighter dimensions from actual meshes only
        // Detach from parent temporarily to avoid double-scaling and double-rotation.
        // We want the local unscaled, unrotated dimensions of the normalized scene.
        const originalParent = normalizedScene.parent
        normalizedScene.parent = null
        
        const combinedBox = getActualBoundingBox(normalizedScene)
        
        // Restore parent
        normalizedScene.parent = originalParent
        
        let dims: [number, number, number] = [1, 1, 1]
        
        if (combinedBox) {
            const size = new THREE.Vector3()
            combinedBox.getSize(size)
            dims = [size.x * item.scale, size.y * item.scale, size.z * item.scale]
        }

        if (!item.dimensions ||
            Math.abs(item.dimensions[0] - dims[0]) > 0.001 ||
            Math.abs(item.dimensions[1] - dims[1]) > 0.001 ||
            Math.abs(item.dimensions[2] - dims[2]) > 0.001) {

            const timeoutId = setTimeout(() => {
                updateItemDimensions(item.id, dims)
            }, 0)
            return () => clearTimeout(timeoutId)
        }
    }, [normalizedScene, item.scale, item.id, item.dimensions, updateItemDimensions])

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
        if (controls) (controls as any).enabled = false

        // Raycast against a fixed mathematical ground plane — no BVH, no R3F event overhead
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        const raycaster = new THREE.Raycaster()
        const hit = new THREE.Vector3()
        const canvas = gl.domElement

        const onMove = (ev: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            const ndcX = ((ev.clientX - rect.left) / rect.width) * 2 - 1
            const ndcY = -((ev.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
            if (raycaster.ray.intersectPlane(groundPlane, hit)) {
                const newX = snapToGrid(hit.x)
                const newZ = snapToGrid(hit.z)
                if (newX !== dragPosRef.current[0] || newZ !== dragPosRef.current[2]) {
                    dragPosRef.current = [newX, dragPosRef.current[1], newZ]
                    if (groupRef.current) {
                        groupRef.current.position.set(newX, dragPosRef.current[1], newZ)
                    }
                }
            }
        }

        const onUp = () => {
            setIsDragging(false)
            if (controls) (controls as any).enabled = true
            updateItemPosition(item.id, dragPosRef.current, true)
            canvas.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
        }

        canvas.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
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
                    <ringGeometry args={[selectionRingRadius - 0.05, selectionRingRadius, 64]} />
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
    const selection = useStore((s) => s.selection)
    const setSelection = useStore((s) => s.setSelection)
    const activeTool = useStore((s) => s.activeTool)

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
                        />
                    </Suspense>
                )
            })}

            {!readonly && <DragPreview />}
            {!readonly && <WindowDragPreview />}
        </group>
    )
}
