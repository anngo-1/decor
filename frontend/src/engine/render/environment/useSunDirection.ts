'use client'

import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { SKY_PRESETS } from '@/engine/config/environment'

export function useSunDirection() {
    const sunAzimuth = useStore((s) => s.sunAzimuth)
    const sunElevation = useStore((s) => s.sunElevation)
    const environmentPreset = useStore((s) => s.environmentPreset)
    const params = SKY_PRESETS[environmentPreset as keyof typeof SKY_PRESETS] ?? SKY_PRESETS.city
    const effectiveElevation = Math.max(1, Math.min(85, params.elevation ?? sunElevation))
    const phi = (90 - effectiveElevation) * (Math.PI / 180)
    const theta = sunAzimuth * (Math.PI / 180)

    return useMemo(
        () => [Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)] as [number, number, number],
        [phi, theta],
    )
}
