'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { Environment } from '@react-three/drei'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store/useStore'

export function AmbientLightRig({
    useEnvironment = true,
}: {
    useEnvironment?: boolean
}) {
    const environmentPreset = useStore((s) => s.environmentPreset)
    const sunIntensity = useStore((s) => s.sunIntensity)
    const lightSignature = useStore(useShallow((s) => s.placedLights.map((l) => `${l.color}:${l.intensity}`)))
    const placedLights = useStore((s) => s.placedLights)

    const { totalIntensity, avgColorHex } = useMemo(() => {
        if (placedLights.length === 0) {
            return { totalIntensity: 0, avgColorHex: 'ffffff' }
        }

        let totalI = 0
        const combinedColor = new THREE.Color(0, 0, 0)
        const tmp = new THREE.Color()

        placedLights.forEach((l) => {
            totalI += l.intensity
            tmp.set(l.color)
            combinedColor.add(tmp.multiplyScalar(l.intensity))
        })

        if (totalI > 0) {
            combinedColor.multiplyScalar(1 / totalI)
        } else {
            combinedColor.set(1, 1, 1)
        }

        return { totalIntensity: totalI, avgColorHex: combinedColor.getHexString() }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lightSignature])

    const avgColor = useMemo(() => new THREE.Color('#' + avgColorHex), [avgColorHex])
    const baseIntensity = sunIntensity * 0.4
    const boostFactor = 0.004
    const finalIntensity = baseIntensity + totalIntensity * boostFactor
    const environmentPresetValue = environmentPreset as React.ComponentProps<typeof Environment>['preset']

    return (
        <>
            <ambientLight intensity={finalIntensity} color={avgColor} />
            {useEnvironment && <Environment preset={environmentPresetValue} />}
        </>
    )
}
