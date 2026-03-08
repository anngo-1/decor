'use client'

import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { PlacedLight } from '@/types'
import { useStore } from '@/store/useStore'
import { useLightDrag } from '@/engine/runtime/interactions/useLightDrag'
import type { QualityTier } from '@/engine/runtime/quality'

const dragPlaneGeo = new THREE.PlaneGeometry(200, 200)
const dragPlaneMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
    side: THREE.DoubleSide,
})

function PlacedLightMesh({
    light,
    isSelected,
    onDragStart,
    castShadow,
    isLowPerfDevice,
    qualityTier,
    onHoverStart,
    onHoverEnd,
}: {
    light: PlacedLight
    isSelected: boolean
    onDragStart: () => void
    castShadow: boolean
    isLowPerfDevice: boolean
    qualityTier: QualityTier
    onHoverStart: () => void
    onHoverEnd: () => void
}) {
    const setSelection = useStore((s) => s.setSelection)
    const showLightingControls = useStore((s) => s.showLightingControls)
    const roomPolygons = useStore((s) => s.roomPolygons)
    const wallHeight = useStore((s) => s.wallHeight)

    const shadowNear = 0.1
    const shadowFar = useMemo(() => {
        let maxDist = shadowNear + 0.5
        const [lx, ly, lz] = light.position

        for (const poly of roomPolygons) {
            for (const p of poly.points) {
                const dx = p.x - lx
                const dz = p.z - lz
                const distToFloorCorner = Math.hypot(dx, ly, dz)
                const distToTopCorner = Math.hypot(dx, wallHeight - ly, dz)
                if (distToFloorCorner > maxDist) maxDist = distToFloorCorner
                if (distToTopCorner > maxDist) maxDist = distToTopCorner
            }
        }

        const padded = maxDist + 0.75
        return Math.max(shadowNear + 0.1, Math.min(light.distance, padded))
    }, [light.position, light.distance, roomPolygons, wallHeight])

    const shadowBaseMapSize = isLowPerfDevice
        ? (light.distance > 12 ? 512 : 1024)
        : (light.distance > 14 ? 1024 : 2048)
    const shadowMapSize = qualityTier === 'high'
        ? shadowBaseMapSize
        : qualityTier === 'medium'
            ? Math.max(512, Math.floor(shadowBaseMapSize / 2))
            : 512

    return (
        <group position={light.position}>
            <mesh
                onPointerDown={(e) => {
                    e.stopPropagation()
                    setSelection({ type: 'light', id: light.id })
                    onDragStart()
                }}
                onPointerEnter={() => { if (showLightingControls) onHoverStart() }}
                onPointerLeave={onHoverEnd}
            >
                <sphereGeometry args={[0.25, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {showLightingControls && (
                <>
                    <mesh>
                        <sphereGeometry args={[0.12, 16, 16]} />
                        <meshBasicMaterial color={light.color} toneMapped={false} />
                    </mesh>
                    <mesh>
                        <sphereGeometry args={[0.28, 16, 16]} />
                        <meshBasicMaterial color={light.color} transparent opacity={isSelected ? 0.35 : 0.15} toneMapped={false} depthWrite={false} />
                    </mesh>
                    {isSelected && (
                        <mesh rotation={[-Math.PI / 2, 0, 0]}>
                            <ringGeometry args={[0.38, 0.46, 32]} />
                            <meshBasicMaterial color="#6366f1" side={THREE.DoubleSide} transparent opacity={0.8} />
                        </mesh>
                    )}
                </>
            )}

            <pointLight
                distance={light.distance}
                intensity={light.intensity}
                color={light.color}
                decay={2}
                castShadow={castShadow}
                shadow-mapSize={[shadowMapSize, shadowMapSize]}
                shadow-camera-near={shadowNear}
                shadow-camera-far={shadowFar}
                shadow-bias={-0.0002}
                shadow-normalBias={0.005}
            />
        </group>
    )
}

export function PlacedLights({
    orbitRef,
    isLowPerfDevice,
    qualityTier,
}: {
    orbitRef: React.RefObject<OrbitControlsImpl | null>
    isLowPerfDevice: boolean
    qualityTier: QualityTier
}) {
    const placedLights = useStore((s) => s.placedLights)
    const shadowsEnabled = useStore((s) => s.shadowsEnabled)
    const selection = useStore((s) => s.selection)
    const updateLight = useStore((s) => s.updateLight)
    const { camera, gl } = useThree()
    const canvas = gl.domElement
    const { draggingId, startDrag, endDrag, handleDragPlanePointerMove } = useLightDrag({
        orbitRef,
        gl,
        camera,
        updateLight,
    })

    const shadowCasterIds = useMemo(() => {
        if (!shadowsEnabled || placedLights.length === 0) return new Set<string>()

        const maxShadowLights = isLowPerfDevice ? 1 : 2
        const ids: string[] = []

        if (selection?.type === 'light' && placedLights.some((l) => l.id === selection.id)) {
            ids.push(selection.id)
        }

        for (const l of placedLights) {
            if (ids.length >= maxShadowLights) break
            if (!ids.includes(l.id)) ids.push(l.id)
        }

        return new Set(ids)
    }, [shadowsEnabled, placedLights, selection, isLowPerfDevice])

    const draggingLight = draggingId ? placedLights.find((l) => l.id === draggingId) ?? null : null

    return (
        <group>
            {draggingLight && (
                <mesh
                    geometry={dragPlaneGeo}
                    material={dragPlaneMat}
                    position={[0, draggingLight.position[1], 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    onPointerMove={(e) => handleDragPlanePointerMove(e, draggingLight)}
                    onPointerUp={endDrag}
                    onPointerLeave={endDrag}
                />
            )}

            {placedLights.map((light) => (
                <PlacedLightMesh
                    key={light.id}
                    light={light}
                    isSelected={selection?.type === 'light' && selection.id === light.id}
                    onDragStart={() => startDrag(light)}
                    castShadow={shadowCasterIds.has(light.id)}
                    isLowPerfDevice={isLowPerfDevice}
                    qualityTier={qualityTier}
                    onHoverStart={() => { canvas.style.cursor = 'grab' }}
                    onHoverEnd={() => { canvas.style.cursor = '' }}
                />
            ))}
        </group>
    )
}
