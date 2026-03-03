'use client'

import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import type { Vec2, WindowOpening, PlacedItem } from '@/types'
import { SNAP } from '@/utils/grid'

const WALL_THICKNESS = 0.114

const sharedWallGeo = new THREE.BoxGeometry(1, 1, 1)

// --- Wall panel decomposition ---

type WallPanel = {
    z: number  // local Z center (along wall)
    y: number  // local Y center (relative to group at wallHeight/2)
    zw: number // Z extent (width along wall)
    h: number  // height
}

/**
 * Decompose a wall into non-overlapping solid panels given a list of window openings.
 * All coordinates are in the WallSegment group's local space:
 *   Z in [-length/2, +length/2], Y=0 = wall center height.
 */
function buildWallPanels(
    length: number,
    wallHeight: number,
    windows: WindowOpening[],
): WallPanel[] {
    // Validate + sort windows by position
    const sorted = [...windows]
        .filter((w) => {
            const wLeft = (w.position - 0.5) * length - w.width / 2
            const wRight = (w.position - 0.5) * length + w.width / 2
            return (
                wLeft >= -length / 2 - 0.001 &&
                wRight <= length / 2 + 0.001 &&
                w.sillHeight >= 0 &&
                w.sillHeight + w.height <= wallHeight + 0.001
            )
        })
        .sort((a, b) => a.position - b.position)

    const panels: WallPanel[] = []
    let cursor = -length / 2

    for (const win of sorted) {
        const winZ = (win.position - 0.5) * length
        const winLeft = winZ - win.width / 2
        const winRight = winZ + win.width / 2

        // Left full-height section (cursor → winLeft)
        const leftLen = winLeft - cursor
        if (leftLen > 0.001) {
            panels.push({ z: cursor + leftLen / 2, y: 0, zw: leftLen, h: wallHeight })
        }

        // Bottom sill (floor → window bottom)
        if (win.sillHeight > 0.001) {
            panels.push({
                z: winZ,
                y: -wallHeight / 2 + win.sillHeight / 2,
                zw: win.width,
                h: win.sillHeight,
            })
        }

        // Top panel (window top → wall top)
        const topH = wallHeight - win.sillHeight - win.height
        if (topH > 0.001) {
            panels.push({
                z: winZ,
                y: wallHeight / 2 - topH / 2,
                zw: win.width,
                h: topH,
            })
        }

        cursor = winRight
    }

    // Right full-height section (cursor → length/2)
    const rightLen = length / 2 - cursor
    if (rightLen > 0.001) {
        panels.push({ z: cursor + rightLen / 2, y: 0, zw: rightLen, h: wallHeight })
    }

    return panels
}

// --- WallSegment ---

function WallSegment({
    p1,
    p2,
    height,
    ghost = false,
    polygonId,
    segmentIndex,
    customColor,
    readonly = false,
    windows = [],
}: {
    p1: Vec2
    p2: Vec2
    height: number
    ghost?: boolean
    polygonId?: string
    segmentIndex?: number
    customColor?: string
    readonly?: boolean
    windows?: WindowOpening[]
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

    // Tiny deterministic Y offset to prevent Z-fighting when segments overlap
    let yOffset = 0
    if (polygonId && segmentIndex !== undefined) {
        let hash = 0
        const str = polygonId + '-' + segmentIndex
        for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0
        yOffset = ((Math.abs(hash) % 100) / 100) * 0.03 - 0.015
    }

    const handleClick = (e: { stopPropagation: () => void }) => {
        if (readonly || ghost || activeTool !== 'select') return
        if (polygonId && segmentIndex !== undefined) {
            e.stopPropagation()
            setSelection({ type: 'wall', id: `${polygonId}-${segmentIndex}` })
        }
    }

    const hasWindows = !ghost && windows.length > 0
    const panels = useMemo(
        () => hasWindows ? buildWallPanels(length, height, windows) : [],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [hasWindows, length, height, JSON.stringify(windows)],
    )

    return (
        <group position={[mx, (height / 2) + yOffset, mz]} rotation={[0, angle, 0]}>
            {hasWindows ? (
                /* Multi-panel wall with window holes — each panel tagged for wall raycasting */
                panels.map((panel, i) => (
                    <mesh
                        key={i}
                        geometry={sharedWallGeo}
                        position={[0, panel.y, panel.z]}
                        scale={[WALL_THICKNESS, panel.h, panel.zw]}
                        receiveShadow
                        castShadow
                        onClick={handleClick}
                        userData={{ isWall: true, polygonId, segmentIndex }}
                    >
                        <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
                    </mesh>
                ))
            ) : (
                /* Original single-box wall — tagged for wall raycasting */
                <mesh
                    geometry={sharedWallGeo}
                    scale={[WALL_THICKNESS, height, length + WALL_THICKNESS]}
                    receiveShadow
                    castShadow
                    onClick={handleClick}
                    userData={{ isWall: true, polygonId, segmentIndex }}
                >
                    {ghost ? (
                        <meshStandardMaterial color="#7c6af7" transparent opacity={0.35} roughness={0.5} metalness={0} />
                    ) : (
                        <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
                    )}
                </mesh>
            )}

            {/* Selection outline — single box covering entire wall extent */}
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
    const placedItems = useStore((s) => s.placedItems)

    return (
        <group>
            {roomPolygons.map((poly) => {
                const pts = poly.points
                if (pts.length < 2) return null
                const pairs: [Vec2, Vec2][] = []
                for (let i = 0; i < pts.length - 1; i++) pairs.push([pts[i], pts[i + 1]])
                if (poly.closed) pairs.push([pts[pts.length - 1], pts[0]])
                return (
                    <group key={poly.id}>
                        {pairs.map(([a, b], i) => {
                            const segProps = poly.segmentProps?.[i]
                            const segH = segProps?.height ?? wallHeight

                            // Derive windows from placed items referencing this segment
                            const segWindows: WindowOpening[] = placedItems
                                .filter((it): it is PlacedItem & Required<Pick<PlacedItem, 'wallRef' | 'windowSize'>> =>
                                    !!(it.isWindow && it.wallRef?.polygonId === poly.id && it.wallRef?.segmentIndex === i && it.windowSize)
                                )
                                .map((it) => ({
                                    id: it.id,
                                    position: it.wallRef.positionAlongWall,
                                    width: it.windowSize.width,
                                    height: it.windowSize.height,
                                    sillHeight: it.windowSize.sillHeight,
                                }))

                            return (
                                <WallSegment
                                    key={i}
                                    p1={a}
                                    p2={b}
                                    height={segH}
                                    polygonId={poly.id}
                                    segmentIndex={i}
                                    customColor={segProps?.color}
                                    windows={segWindows}
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

// --- Ceiling + Floor ---

function PolygonFloor({ points }: { points: Vec2[] }) {
    const floorGeo = useMemo(() => {
        const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.z)))
        const geo = new THREE.ShapeGeometry(shape)
        geo.rotateX(-Math.PI / 2)
        return geo
    }, [points])

    useEffect(() => {
        return () => { floorGeo.dispose() }
    }, [floorGeo])

    return (
        <mesh geometry={floorGeo} position={[0, 0.002, 0]} receiveShadow>
            <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0.0} toneMapped={false} />
        </mesh>
    )
}

export function RoomCeilingAndFloor() {
    const roomPolygons = useStore((s) => s.roomPolygons)
    const wallHeight = useStore((s) => s.wallHeight)
    const ceilingEnabled = useStore((s) => s.ceilingEnabled)
    const ceilingTransparent = useStore((s) => s.ceilingTransparent)

    if (!ceilingEnabled) return null

    return (
        <group>
            {/* Global ceiling — large plane at wallHeight, visible from below.
                When transparent, we skip rendering entirely: opacity=0 meshes still
                write to the depth buffer and SSAO processes their geometry, causing
                a visible darkening band at the ceiling plane when orbiting.
                Shadow blocking is handled by disabling castShadow on the directional light. */}
            {!ceilingTransparent && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]}>
                    <planeGeometry args={[200, 200]} />
                    <meshStandardMaterial
                        color="#e8e6e1"
                        roughness={0.85}
                        metalness={0.02}
                        side={THREE.BackSide}
                    />
                </mesh>
            )}
            {/* Per-polygon floor overlay — bounded to the room footprint */}
            {roomPolygons
                .filter((poly) => poly.closed && poly.points.length >= 3)
                .map((poly) => (
                    <PolygonFloor key={poly.id} points={poly.points} />
                ))}
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
