import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export function useCustomZoom({
    orbitRef,
    readonly = false,
}: {
    orbitRef: React.RefObject<OrbitControlsImpl | null>
    readonly?: boolean
}) {
    const { gl, camera, invalidate } = useThree()

    useEffect(() => {
        const canvas = gl.domElement

        const onWheel = (e: WheelEvent) => {
            if (e.defaultPrevented) return

            if (!e.ctrlKey && readonly) {
                e.stopImmediatePropagation()
                return
            }

            e.preventDefault()
            e.stopImmediatePropagation()

            if (!orbitRef.current) return

            const isTrackpadPinch = e.ctrlKey
            const zoomSpeed = isTrackpadPinch ? 0.08 : 0.02
            const zoomDelta = e.deltaY * zoomSpeed

            camera.translateZ(zoomDelta)

            const targetDistance = camera.position.distanceTo(orbitRef.current.target)
            if (targetDistance < orbitRef.current.minDistance) {
                camera.translateZ(-(orbitRef.current.minDistance - targetDistance))
            } else if (targetDistance > orbitRef.current.maxDistance) {
                camera.translateZ(targetDistance - orbitRef.current.maxDistance)
            }

            invalidate()
        }

        canvas.addEventListener('wheel', onWheel, { capture: true, passive: false })
        return () => canvas.removeEventListener('wheel', onWheel, { capture: true })
    }, [gl, camera, orbitRef, readonly, invalidate])
}

export function CustomZoomBridge({
    orbitRef,
    readonly = false,
}: {
    orbitRef: React.RefObject<OrbitControlsImpl | null>
    readonly?: boolean
}) {
    useCustomZoom({ orbitRef, readonly })
    return null
}
