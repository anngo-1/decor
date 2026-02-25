'use client'

import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import type { Vec2 } from '@/types'
import { SNAP } from '@/utils/grid'

const WALL_THICKNESS = 0.114

const sharedWallGeo = new THREE.BoxGeometry(1, 1, 1)

function WallSegment({
    p1,
    p2,
    height,
    ghost = false,
    polygonId,
    segmentIndex,
    customColor,
    readonly = false,
}: {
    p1: Vec2
    p2: Vec2
    height: number
    ghost?: boolean
    polygonId?: string
    segmentIndex?: number
    customColor?: string
    readonly?: boolean
}) {
    const dx = p2.x - p1.x
    const dz = p2.z - p1.z
    const length = Math.sqrt(dx * dx + dz * dz)

    const angle = Math.atan2(dx, dz)
    const mx = (p1.x + p2.x) / 2
    const mz = (p1.z + p2.z) / 2

    const selection = useStore((s) => s.selection)
    const setSelection = useStore((s) => s.setSelection)
    const activeTool = useStore((s) => s.activeTool)

    const isSelected = polygonId && segmentIndex !== undefined && selection?.type === 'wall' && selection.id === `${polygonId}-${segmentIndex}`
    const color = customColor || '#e8e6e1'

    // To prevent Z-fighting when segments mathematically overlap (e.g. drawn over each other),
    // we use a tiny deterministic offset based on the polygon/segment IDs.
    let yOffset = 0
    if (polygonId && segmentIndex !== undefined) {
        // Simple hash to get a tiny offset between -0.005 and 0.005
        let hash = 0
        const str = polygonId + '-' + segmentIndex
        for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0
        // Calculate offset between -0.015 and 0.015 meters (1.5cm)
        yOffset = ((Math.abs(hash) % 100) / 100) * 0.03 - 0.015
    }

    return (
        <group
            // Add tiny Y offset to prevent Z-fighting if drawn exactly over another
            position={[mx, (height / 2) + yOffset, mz]}
            rotation={[0, angle, 0]}
        >
            <mesh
                geometry={sharedWallGeo}
                scale={[WALL_THICKNESS, height, length + WALL_THICKNESS]}
                receiveShadow
                castShadow
                onClick={(e) => {
                    if (readonly || ghost || activeTool !== 'select') return
                    if (polygonId && segmentIndex !== undefined) {
                        e.stopPropagation()
                        setSelection({ type: 'wall', id: `${polygonId}-${segmentIndex}` })
                    }
                }}
            >
                {ghost ? (
                    <meshStandardMaterial color="#7c6af7" transparent opacity={0.35} roughness={0.5} metalness={0} />
                ) : (
                    <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
                )}
            </mesh>

            {isSelected && !ghost && (
                <mesh geometry={sharedWallGeo} scale={[WALL_THICKNESS + 0.18, height + 0.05, length + WALL_THICKNESS + 0.18]}>
                    <meshBasicMaterial color="#6366f1" side={THREE.BackSide} depthWrite={false} />
                </mesh>
            )}
        </group>
    )
}

export function WallSystem({ readonly = false }: { readonly?: boolean }) {
    const roomPolygons = useStore((s) => s.roomPolygons)
    const wallHeight = useStore((s) => s.wallHeight)

    return (
        <group>
            {roomPolygons.map((poly) => {
                const pts = poly.points
                if (pts.length < 2) return null
                // Build segment pairs: always consecutive, plus closing segment if closed
                const pairs: [Vec2, Vec2][] = []
                for (let i = 0; i < pts.length - 1; i++) pairs.push([pts[i], pts[i + 1]])
                if (poly.closed) pairs.push([pts[pts.length - 1], pts[0]])
                return (
                    <group key={poly.id}>
                        {pairs.map(([a, b], i) => {
                            const segProps = poly.segmentProps?.[i]
                            return (
                                <WallSegment
                                    key={i}
                                    p1={a}
                                    p2={b}
                                    height={segProps?.height ?? wallHeight}
                                    polygonId={poly.id}
                                    segmentIndex={i}
                                    customColor={segProps?.color}
                                    readonly={readonly}
                                />
                            )
                        })}
                    </group>
                )
            })}
        </group>
    )
}

/** Confirmed point dot */
function PointMarker({ position, snap }: { position: Vec2; snap?: boolean }) {
    const geo = useMemo(() => new THREE.CylinderGeometry(snap ? 0.12 : 0.08, snap ? 0.12 : 0.08, 0.1, 24), [snap])
    const mat = useMemo(() => new THREE.MeshStandardMaterial({
        color: snap ? '#f97316' : '#7c6af7',
        emissive: snap ? '#f97316' : '#7c6af7',
        emissiveIntensity: snap ? 0.8 : 0.5
    }), [snap])

    useEffect(() => {
        return () => {
            geo.dispose()
            mat.dispose()
        }
    }, [geo, mat])

    return (
        <mesh position={[position.x, 0.06, position.z]} geometry={geo} material={mat} />
    )
}

/** Glowing ring at the live snapped cursor position */
function HoverCursor({ position, snappingToFirst }: { position: Vec2; snappingToFirst: boolean }) {
    const color = snappingToFirst ? '#f97316' : '#7c6af7'
    const geo = useMemo(() => new THREE.RingGeometry(0.10, 0.18, 32), [])
    const mat = useMemo(() => new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    }), [color])

    useEffect(() => {
        return () => {
            geo.dispose()
            mat.dispose()
        }
    }, [geo, mat])

    return (
        <mesh geometry={geo} material={mat} position={[position.x, 0.05, position.z]} rotation={[-Math.PI / 2, 0, 0]} />
    )
}

const GUIDE_EXTENT = 60 // metres each direction — long enough to cross any room
const GUIDE_TOL = SNAP * 0.6 // show guide if within 60% of a snap increment

export function WallPreview() {
    const currentWallPoints = useStore((s) => s.currentWallPoints)
    const roomPolygons = useStore((s) => s.roomPolygons)
    const wallHeight = useStore((s) => s.wallHeight)
    const hoverPoint = useStore((s) => s.hoverPoint)

    const snapsToFirst =
        hoverPoint !== null &&
        currentWallPoints.length >= 3 &&
        Math.hypot(hoverPoint.x - currentWallPoints[0].x, hoverPoint.z - currentWallPoints[0].z) < 0.75

    const effectiveHover = snapsToFirst ? currentWallPoints[0] : hoverPoint
    const hasPoints = currentWallPoints.length >= 1

    // All known wall points (existing polygons + current stroke) for alignment detection
    const allPoints = useMemo(() => {
        const pts: Vec2[] = []
        roomPolygons.forEach((poly) => pts.push(...poly.points))
        currentWallPoints.forEach((p) => pts.push(p))
        return pts
    }, [roomPolygons, currentWallPoints])

    // Find which X and Z axes the hover point aligns with
    const xGuides = useMemo(() => {
        if (!effectiveHover) return []
        const seen = new Set<number>()
        return allPoints.filter((p) => {
            if (Math.abs(p.x - effectiveHover.x) < GUIDE_TOL && !seen.has(p.x)) {
                seen.add(p.x); return true
            }
            return false
        }).map((p) => p.x)
    }, [effectiveHover, allPoints])

    const zGuides = useMemo(() => {
        if (!effectiveHover) return []
        const seen = new Set<number>()
        return allPoints.filter((p) => {
            if (Math.abs(p.z - effectiveHover.z) < GUIDE_TOL && !seen.has(p.z)) {
                seen.add(p.z); return true
            }
            return false
        }).map((p) => p.z)
    }, [effectiveHover, allPoints])

    return (
        <group>
            {/* Committed preview segments */}
            {currentWallPoints.map((p, i) => {
                if (i === 0) return null
                return <WallSegment key={`pv-${i}`} p1={currentWallPoints[i - 1]} p2={p} height={wallHeight} />
            })}

            {/* Rubber-band from last point to cursor */}
            {hasPoints && effectiveHover && (
                <WallSegment p1={currentWallPoints[currentWallPoints.length - 1]} p2={effectiveHover} height={wallHeight} ghost />
            )}

            {/* Alignment guide lines — flat on the ground, shown when cursor aligns with existing points */}
            {xGuides.map((x) => (
                <mesh key={`xg-${x}`} position={[x, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.03, GUIDE_EXTENT * 2]} />
                    <meshBasicMaterial color="#6366f1" transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
            ))}
            {zGuides.map((z) => (
                <mesh key={`zg-${z}`} position={[0, 0.008, z]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[GUIDE_EXTENT * 2, 0.03]} />
                    <meshBasicMaterial color="#f97316" transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
            ))}

            {/* Confirmed point markers */}
            {currentWallPoints.map((p, i) => (
                <PointMarker key={`pt-${i}`} position={p} snap={snapsToFirst && i === 0} />
            ))}

            {/* Hover cursor — shows on enter, before first click */}
            {hoverPoint && <HoverCursor position={effectiveHover ?? hoverPoint} snappingToFirst={snapsToFirst} />}
        </group>
    )
}
