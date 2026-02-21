'use client'

import { useRef, useEffect, useState, useMemo, memo, Suspense } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'
import { useStore } from '@/store/useStore'
import type { PlacedItem } from '@/types'

const TARGET_SIZE = 1.5
const SNAP = 0.5

function snapToGrid(v: number): number {
    return Math.round(v / SNAP) * SNAP
}

const _box = new THREE.Box3()
const _v1 = new THREE.Vector3()

function normalizeBoundingBox(object: THREE.Object3D, targetSize = TARGET_SIZE) {
    _box.setFromObject(object)
    const size = _box.getSize(_v1)
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim === 0) return
    const scaleFactor = targetSize / maxDim
    object.scale.setScalar(scaleFactor)

    // Use the updated size/center for positioning
    _box.setFromObject(object)
    const center = _box.getCenter(_v1)
    object.position.x -= center.x
    object.position.z -= center.z
    object.position.y -= _box.min.y
}

interface SceneModelProps {
    item: PlacedItem
    isSelected: boolean
    showSelectionRing?: boolean
    onClick?: () => void
    interactive?: boolean
}


const SceneModel = memo(function SceneModel({ item, isSelected, showSelectionRing = true, onClick, interactive = true }: SceneModelProps) {
    const { scene } = useGLTF(item.modelUrl)
    const updateItemDimensions = useStore((s) => s.updateItemDimensions)
    const activeTool = useStore((s) => s.activeTool)

    const normalizedScene = useMemo(() => {
        const clone = scene.clone()
        clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                if (mesh.material) {
                    mesh.material = (mesh.material as THREE.Material).clone()
                }
            }
        })

        // Always normalize generated items immediately in the memo
        if (item.isGenerated) {
            normalizeBoundingBox(clone, TARGET_SIZE)
        }

        return clone
    }, [scene, item.isGenerated])

    useEffect(() => {
        const shouldBeTransparent = isSelected && !item.isGenerated
        let changed = false
        normalizedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mat = (child as THREE.Mesh).material as THREE.Material
                if (mat && (mat.transparent !== shouldBeTransparent || mat.opacity !== (shouldBeTransparent ? 0.4 : 1.0))) {
                    mat.transparent = shouldBeTransparent
                    mat.opacity = shouldBeTransparent ? 0.4 : 1.0
                    mat.needsUpdate = true
                    changed = true
                }
            }
        })
    }, [normalizedScene, isSelected, item.isGenerated])

    useEffect(() => {
        // Calculate and sync dimensions (width, height, depth) scaled by item.scale
        const box = new THREE.Box3().setFromObject(normalizedScene)
        const size = new THREE.Vector3()
        box.getSize(size)

        const dims: [number, number, number] = [
            size.x * item.scale,
            size.y * item.scale,
            size.z * item.scale
        ]

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
        if (onClick) onClick()
    }

    return (
        <group
            position={item.position}
            rotation={item.rotation}
            scale={item.scale}
            onClick={interactive ? ((e) => { e.stopPropagation(); if (onClick) onClick(); }) : undefined}
            onPointerDown={interactive ? handlePointerDown : undefined}
        >
            <primitive object={normalizedScene} />
            {isSelected && showSelectionRing && (
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.6, 0.75, 32]} />
                    <meshBasicMaterial color="#7c6af7" transparent opacity={0.7} side={THREE.DoubleSide} />
                </mesh>
            )}
        </group>
    )
})

function SelectedMoveInteraction() {
    const selectedItemId = useStore((s) => s.selectedItemId)
    const activeTool = useStore((s) => s.activeTool)
    const placedItems = useStore((s) => s.placedItems)
    const updateItemPosition = useStore((s) => s.updateItemPosition)
    const selectItem = useStore((s) => s.selectItem)
    const [hoverPoint, setHoverPoint] = useState<[number, number, number] | null>(null)

    if (!selectedItemId || activeTool !== 'select') return null

    const currentItem = placedItems.find(it => it.id === selectedItemId)
    if (!currentItem) return null

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setHoverPoint([snapToGrid(e.point.x), currentItem.position[1], snapToGrid(e.point.z)])
    }

    const handlePointerLeave = () => setHoverPoint(null)

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        const newX = snapToGrid(e.point.x)
        const newZ = snapToGrid(e.point.z)
        updateItemPosition(selectedItemId, [newX, currentItem.position[1], newZ])
        selectItem(null)
    }

    const fakeItem: PlacedItem = {
        ...currentItem,
        id: `ghost_${currentItem.id}`,
        position: hoverPoint || currentItem.position
    }

    return (
        <group>
            {/* Invisible plane to catch hover and click events */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.001, 0]}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onPointerDown={handlePointerDown}
            >
                <planeGeometry args={[200, 200]} />
                <meshBasicMaterial visible={false} />
            </mesh>

            {/* Ghost preview rendering where the cursor is */}
            {hoverPoint && (
                <Suspense fallback={null}>
                    <SceneModel item={fakeItem} isSelected={true} showSelectionRing={false} interactive={false} />
                </Suspense>
            )}
        </group>
    )
}

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
            <SceneModel item={fakeItem} isSelected={true} showSelectionRing={false} interactive={false} />
        </Suspense>
    )
}

export function SceneItems({ readonly = false }: { readonly?: boolean }) {
    const placedItems = useStore((s) => s.placedItems)
    const selectedItemId = useStore((s) => s.selectedItemId)
    const selectItem = useStore((s) => s.selectItem)
    const activeTool = useStore((s) => s.activeTool)

    const handleSelect = (id: string) => {
        if (activeTool === 'select' && !readonly) {
            selectItem(id)
        }
    }

    return (
        <group>
            {placedItems.map((item) => (
                <Suspense key={item.id} fallback={null}>
                    <SceneModel
                        item={item}
                        isSelected={item.id === selectedItemId}
                        onClick={() => handleSelect(item.id)}
                        interactive={!readonly}
                    />
                </Suspense>
            ))}

            {!readonly && <SelectedMoveInteraction />}
            {!readonly && <DragPreview />}
        </group>
    )
}
