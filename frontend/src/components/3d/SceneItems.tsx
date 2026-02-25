'use client'

import { useRef, useEffect, useState, useMemo, memo, Suspense } from 'react'
import * as THREE from 'three'
import { useGLTF, useCursor } from '@react-three/drei'
import { ThreeEvent, useThree } from '@react-three/fiber'
import { useStore } from '@/store/useStore'
import type { PlacedItem } from '@/types'
import { snapToGrid } from '@/utils/grid'

const TARGET_SIZE = 1.5

const _box = new THREE.Box3()
const _v1 = new THREE.Vector3()

// Global cache to share converted MeshStandardMaterials across all instances of the same model
const materialCache = new Map<string, THREE.Material>()

// Compute tighter bounding box from actual meshes only, ignoring empty group nodes
function computeTightBounds(object: THREE.Object3D, targetSize = TARGET_SIZE) {
    const meshBoxes: THREE.Box3[] = []
    
    object.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (mesh.isMesh && mesh.geometry) {
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
        const meshBoxes: THREE.Box3[] = []
        
        normalizedScene.traverse((child) => {
            const mesh = child as THREE.Mesh
            if (mesh.isMesh && mesh.geometry) {
                mesh.geometry.computeBoundingBox()
                const geomBox = mesh.geometry.boundingBox
                if (geomBox) {
                    const worldBox = geomBox.clone()
                    worldBox.applyMatrix4(mesh.matrixWorld)
                    meshBoxes.push(worldBox)
                }
            }
        })
        
        let dims: [number, number, number] = [1, 1, 1]
        
        if (meshBoxes.length > 0) {
            const combinedBox = new THREE.Box3()
            for (const box of meshBoxes) {
                combinedBox.union(box)
            }
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

    if (!draggedLibraryItem || !dragHoverPoint) return null

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
        </group>
    )
}
