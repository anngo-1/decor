'use client'

import { Sky } from '@react-three/drei'
import { Stars } from '@react-three/drei'
import { useStore } from '@/store/useStore'
import { SKY_PRESETS } from '@/engine/config/environment'
import { useSunDirection } from '@/engine/render/environment/useSunDirection'

export function SceneSky() {
    const environmentPreset = useStore((s) => s.environmentPreset)
    const params = SKY_PRESETS[environmentPreset as keyof typeof SKY_PRESETS] ?? SKY_PRESETS.city
    const sunDirection = useSunDirection()
    const isNight = environmentPreset === 'night'

    return (
        <>
            <color attach="background" args={[params.background]} />
            <fog attach="fog" args={[params.fogColor, params.fogNear, params.fogFar]} />

            {isNight ? (
                <Stars radius={220} depth={60} count={1800} factor={2.2} saturation={0} fade speed={0.12} />
            ) : (
                <Sky
                    distance={450000}
                    sunPosition={sunDirection}
                    turbidity={params.turbidity}
                    rayleigh={params.rayleigh}
                    mieCoefficient={params.mieCoeff}
                    mieDirectionalG={params.mieG}
                />
            )}
        </>
    )
}
