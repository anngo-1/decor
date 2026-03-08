'use client'

import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { isLowPerfDevice as detectLowPerfDevice } from '@/engine/runtime/deviceProfile'
import type { QualityTier } from '@/engine/runtime/quality'
import { SceneComposition } from '@/engine/render/sceneGraph/SceneComposition'

export function RoomCanvas({ readonly = false }: { readonly?: boolean }) {
    const activeTool = useStore((s) => s.activeTool)
    const setSelection = useStore((s) => s.setSelection)
    const orbitRef = useRef<OrbitControlsImpl | null>(null)
    const isPointerLocked = useStore((s) => s.isPointerLocked)
    const [isOrbiting, setIsOrbiting] = useState(false)
    const [isLowPerfDevice] = useState(detectLowPerfDevice)
    const [qualityTier, setQualityTier] = useState<QualityTier>(isLowPerfDevice ? 'medium' : 'high')
    const maxDpr = qualityTier === 'low' ? 1 : qualityTier === 'medium' ? (isLowPerfDevice ? 1 : 1.1) : (isLowPerfDevice ? 1.1 : 1.25)

    return (
        <Canvas
            frameloop="demand"
            shadows={{ type: qualityTier === 'low' || isLowPerfDevice ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap }}
            dpr={[1, maxDpr]}
            performance={{ min: 0.75, debounce: 200 }}
            gl={{
                antialias: true,
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
            }}
            style={{ background: '#d0e8ff' }}
            onPointerMissed={() => {
                if (activeTool === 'select') {
                    setSelection(null)
                }
            }}
        >
            <PerspectiveCamera makeDefault position={[0, 12, 14]} fov={50} near={0.5} far={100} />
            <SceneComposition
                readonly={readonly}
                activeTool={activeTool}
                isPointerLocked={isPointerLocked}
                orbitRef={orbitRef}
                isLowPerfDevice={isLowPerfDevice}
                qualityTier={qualityTier}
                setQualityTier={setQualityTier}
                isOrbiting={isOrbiting}
                setIsOrbiting={setIsOrbiting}
            />
        </Canvas>
    )
}
