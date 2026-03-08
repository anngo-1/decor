import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export function useOrbitEventSuppressor(orbitRef: React.RefObject<OrbitControlsImpl | null>) {
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
}

export function OrbitEventSuppressorBridge({ orbitRef }: { orbitRef: React.RefObject<OrbitControlsImpl | null> }) {
    useOrbitEventSuppressor(orbitRef)
    return null
}
