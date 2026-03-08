import { useCallback, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { PlacedLight } from '@/types'
import { snapToGrid } from '@/utils/grid'
import { useStore } from '@/store/useStore'

type UpdateLight = (id: string, update: Partial<Omit<PlacedLight, 'id'>>, noCommit?: boolean) => void

export function useLightDrag({
    orbitRef,
    gl,
    camera,
    updateLight,
}: {
    orbitRef: React.RefObject<OrbitControlsImpl | null>
    gl: THREE.WebGLRenderer
    camera: THREE.Camera
    updateLight: UpdateLight
}) {
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
    const dragRaycaster = useRef(new THREE.Raycaster())
    const dragHit = useRef(new THREE.Vector3())
    const canvas = gl.domElement

    const startDrag = useCallback((light: PlacedLight) => {
        setDraggingId(light.id)
        dragPlane.current.constant = -light.position[1]
        if (orbitRef.current) orbitRef.current.enabled = false
        // eslint-disable-next-line react-hooks/immutability
        canvas.style.cursor = 'grabbing'
    }, [orbitRef, canvas])

    const endDrag = useCallback(() => {
        setDraggingId(null)
        if (orbitRef.current) orbitRef.current.enabled = true
        // eslint-disable-next-line react-hooks/immutability
        canvas.style.cursor = ''
        useStore.getState().commitHistory()
    }, [orbitRef, canvas])

    const handleDragPlanePointerMove = useCallback((e: ThreeEvent<PointerEvent>, light: PlacedLight) => {
        e.stopPropagation()
        dragRaycaster.current.setFromCamera(e.pointer, camera)
        if (dragRaycaster.current.ray.intersectPlane(dragPlane.current, dragHit.current)) {
            const position: [number, number, number] = [
                snapToGrid(dragHit.current.x),
                light.position[1],
                snapToGrid(dragHit.current.z),
            ]
            updateLight(light.id, { position }, true)
        }
    }, [camera, updateLight])

    return {
        draggingId,
        startDrag,
        endDrag,
        handleDragPlanePointerMove,
    }
}
