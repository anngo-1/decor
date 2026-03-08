import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { snapToGrid } from '@/utils/grid'

export function useAssetDragDrop() {
    const { gl, camera, scene } = useThree()

    useEffect(() => {
        const canvas = gl.domElement
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        const raycaster = new THREE.Raycaster()
        const hit = new THREE.Vector3()
        const ndc = new THREE.Vector2()

        let cachedWallMeshes: THREE.Object3D[] | null = null

        const getNdc = (e: DragEvent) => {
            const rect = canvas.getBoundingClientRect()
            return ndc.set(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1,
            )
        }

        const onDragOver = (e: DragEvent) => {
            e.preventDefault()
            const { draggedLibraryItem, setDragHoverPoint, setDragWindowHit, roomPolygons } = useStore.getState()
            if (!draggedLibraryItem) return

            raycaster.setFromCamera(getNdc(e), camera)

            if (draggedLibraryItem.isWindow) {
                if (!cachedWallMeshes) {
                    cachedWallMeshes = []
                    scene.traverse((obj) => {
                        if (obj.userData.isWall) cachedWallMeshes!.push(obj)
                    })
                }

                const hits = raycaster.intersectObjects(cachedWallMeshes, false)
                if (hits.length > 0) {
                    const wallHit = hits[0]
                    const { polygonId, segmentIndex } = wallHit.object.userData as { polygonId: string; segmentIndex: number }
                    const poly = roomPolygons.find((p) => p.id === polygonId)
                    if (poly) {
                        const points = poly.points
                        const pairs: Array<[{ x: number; z: number }, { x: number; z: number }]> = []
                        for (let i = 0; i < points.length - 1; i++) pairs.push([points[i], points[i + 1]])
                        if (poly.closed) pairs.push([points[points.length - 1], points[0]])
                        const pair = pairs[segmentIndex]
                        if (pair) {
                            const [p1, p2] = pair
                            const dx = p2.x - p1.x
                            const dz = p2.z - p1.z
                            const length = Math.sqrt(dx * dx + dz * dz)
                            if (length > 0) {
                                const dirX = dx / length
                                const dirZ = dz / length
                                const wallAngle = Math.atan2(dx, dz)
                                const winSize = draggedLibraryItem.defaultWindowSize ?? { width: 1.2, height: 1.2, sillHeight: 0.9 }
                                const halfW = winSize.width / 2
                                const margin = halfW / length
                                const t = Math.max(
                                    margin + 0.01,
                                    Math.min(
                                        1 - margin - 0.01,
                                        ((wallHit.point.x - p1.x) * dirX + (wallHit.point.z - p1.z) * dirZ) / length,
                                    ),
                                )
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
                    }
                } else {
                    setDragWindowHit(null)
                }

                return
            }

            if (raycaster.ray.intersectPlane(groundPlane, hit)) {
                setDragHoverPoint([snapToGrid(hit.x), 0, snapToGrid(hit.z)])
            }
        }

        const onDragLeave = () => {
            cachedWallMeshes = null
            useStore.getState().setDragHoverPoint(null)
            useStore.getState().setDragWindowHit(null)
        }

        const onDrop = (e: DragEvent) => {
            e.preventDefault()
            cachedWallMeshes = null

            const {
                draggedLibraryItem,
                dragWindowHit,
                placeItem,
                setDraggedLibraryItem,
                setDragHoverPoint,
                setDragWindowHit,
            } = useStore.getState()

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

            raycaster.setFromCamera(getNdc(e), camera)
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
    }, [gl, camera, scene])
}

export function AssetDragDropBridge() {
    useAssetDragDrop()
    return null
}
