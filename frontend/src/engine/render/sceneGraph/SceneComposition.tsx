'use client'

import { Suspense } from 'react'
import { OrbitControls, PointerLockControls, Bvh } from '@react-three/drei'
import { EffectComposer, N8AO } from '@react-three/postprocessing'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { GRID_PRESETS } from '@/engine/config/environment'
import type { QualityTier } from '@/engine/runtime/quality'
import { StoreInvalidatorBridge } from '@/engine/runtime/render/StoreInvalidatorBridge'
import { ScreenshotBridge } from '@/engine/runtime/render/ScreenshotBridge'
import { EngineDebugStatsBridge } from '@/engine/runtime/useEngineDebugStats'
import { FrameProfilerBridge } from '@/engine/runtime/perf/FrameProfilerBridge'
import { AdaptiveQualityBridge } from '@/engine/runtime/perf/AdaptiveQualityBridge'
import { PerfRegressionBridge } from '@/engine/runtime/perf/PerfRegressionBridge'
import { AssetDragDropBridge } from '@/engine/runtime/interactions/useAssetDragDrop'
import { OrbitEventSuppressorBridge } from '@/engine/runtime/camera/useOrbitEventSuppressor'
import { CustomZoomBridge } from '@/engine/runtime/camera/useCustomZoom'
import { MovementControlsBridge } from '@/engine/runtime/camera/useMovementControls'
import { SceneLoader } from '@/components/3d/SceneLoader'
import { SceneSky } from '@/engine/render/environment/SceneSky'
import { AmbientLightRig } from '@/engine/render/environment/AmbientLightRig'
import { PlacedLights } from '@/engine/render/lights/PlacedLights'
import { WallInteractionPlane } from '@/engine/render/walls/WallInteractionPlane'
import { WallSystem, WallPreview, RoomCeilingAndFloor } from '@/components/3d/WallSystem'
import { SceneItems } from '@/components/3d/SceneItems'
import { InfiniteGrid } from '@/components/3d/InfiniteGrid'

const floorBgMat = new THREE.MeshStandardMaterial({ color: '#f2f1ef', roughness: 1, metalness: 0, toneMapped: false })
const floorBgGeo = new THREE.PlaneGeometry(200, 200)

export function SceneComposition({
    readonly,
    activeTool,
    isPointerLocked,
    orbitRef,
    isLowPerfDevice,
    qualityTier,
    setQualityTier,
    isOrbiting,
    setIsOrbiting,
}: {
    readonly: boolean
    activeTool: ReturnType<typeof useStore.getState>['activeTool']
    isPointerLocked: boolean
    orbitRef: React.RefObject<OrbitControlsImpl | null>
    isLowPerfDevice: boolean
    qualityTier: QualityTier
    setQualityTier: (tier: QualityTier) => void
    isOrbiting: boolean
    setIsOrbiting: (v: boolean) => void
}) {
    const { gl } = useThree()
    const shadowsEnabled = useStore((s) => s.shadowsEnabled)
    const environmentPreset = useStore((s) => s.environmentPreset)
    const gridPreset = GRID_PRESETS[environmentPreset as keyof typeof GRID_PRESETS] ?? GRID_PRESETS.city

    const useAo = shadowsEnabled && !readonly && !isLowPerfDevice && qualityTier !== 'low'
    const aoRadius = isOrbiting ? 0.35 : qualityTier === 'medium' ? 0.42 : 0.45
    const aoIntensity = isOrbiting ? 0.95 : qualityTier === 'medium' ? 1.05 : 1.2
    const aoSamples = isOrbiting ? 4 : qualityTier === 'medium' ? 6 : 8
    const aoDenoiseSamples = isOrbiting ? 1 : qualityTier === 'medium' ? 1 : 2
    const canUseComposer = (() => {
        try {
            return gl.getContextAttributes?.() != null
        } catch {
            return false
        }
    })()

    return (
        <>
            <StoreInvalidatorBridge />
            <FrameProfilerBridge />
            <PerfRegressionBridge />
            <EngineDebugStatsBridge />
            <AdaptiveQualityBridge
                readonly={readonly}
                isLowPerfDevice={isLowPerfDevice}
                qualityTier={qualityTier}
                setQualityTier={setQualityTier}
            />
            <SceneLoader />
            <AssetDragDropBridge />
            <ScreenshotBridge />
            <SceneSky />

            <Suspense fallback={<ambientLight intensity={0.5} />}>
                <AmbientLightRig
                    useEnvironment={!isLowPerfDevice}
                />
            </Suspense>

            <PlacedLights orbitRef={orbitRef} isLowPerfDevice={isLowPerfDevice} qualityTier={qualityTier} />

            {useAo && canUseComposer && (
                <EffectComposer multisampling={0}>
                    <N8AO
                        halfRes
                        aoRadius={aoRadius}
                        intensity={aoIntensity}
                        aoSamples={aoSamples}
                        denoiseSamples={aoDenoiseSamples}
                        color="black"
                    />
                </EffectComposer>
            )}

            {!readonly && (
                <mesh geometry={floorBgGeo} material={floorBgMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow />
            )}

            {!readonly && (
                <InfiniteGrid
                    args={[200, 200]}
                    position={[0, 0.005, 0]}
                    cellSize={0.1}
                    cellThickness={0.7}
                    cellColor={gridPreset.cellColor}
                    sectionSize={1}
                    sectionThickness={1.5}
                    sectionColor={gridPreset.sectionColor}
                    fadeDistance={40}
                    fadeStrength={1.2}
                    infiniteGrid
                    material-depthWrite={false}
                    material-toneMapped={false}
                />
            )}

            <Bvh firstHitOnly>
                <WallSystem readonly={readonly} />
                <RoomCeilingAndFloor />
                {!readonly && <WallPreview />}
                <SceneItems readonly={readonly} />
            </Bvh>

            {!readonly && activeTool === 'wall' && <WallInteractionPlane />}

            <OrbitControls
                ref={orbitRef}
                makeDefault
                enabled={!isPointerLocked}
                enableDamping
                dampingFactor={0.05}
                minDistance={2}
                maxDistance={40}
                maxPolarAngle={Math.PI / 2.1}
                enableZoom={false}
                enablePan={true}
                onStart={() => setIsOrbiting(true)}
                onEnd={() => setIsOrbiting(false)}
            />

            <OrbitEventSuppressorBridge orbitRef={orbitRef} />
            <CustomZoomBridge orbitRef={orbitRef} readonly={readonly} />

            {!readonly && (
                <>
                    {isPointerLocked && <PointerLockControls />}
                    <MovementControlsBridge orbitRef={orbitRef} isPointerLocked={isPointerLocked} />
                </>
            )}
        </>
    )
}
