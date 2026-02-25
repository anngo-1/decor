import type { Vec2 } from '@/types'

export const SNAP = 0.1  // matches the visual grid cell size

export function snapToGrid(v: number): number {
    return Math.round(v / SNAP) * SNAP
}

// Snaps exactly to the nearest existing point if within radius.
const POINT_SNAP_RADIUS = 0.4
export function snapToPoint(x: number, z: number, points: Vec2[]): Vec2 | null {
    let best: Vec2 | null = null
    let bestDist = POINT_SNAP_RADIUS * POINT_SNAP_RADIUS
    for (const p of points) {
        const d = (p.x - x) ** 2 + (p.z - z) ** 2
        if (d < bestDist) { bestDist = d; best = p }
    }
    return best
}

// After grid-snapping, nudges x/z onto any existing point's axis if within radius.
// This makes walls "magnetic" to existing geometry without forcing a full point snap.
const ALIGN_SNAP_RADIUS = 0.15
export function applyAlignmentSnap(pt: Vec2, points: Vec2[]): Vec2 {
    let x = pt.x
    let z = pt.z
    let bestX = ALIGN_SNAP_RADIUS
    let bestZ = ALIGN_SNAP_RADIUS
    for (const p of points) {
        const dx = Math.abs(p.x - pt.x)
        const dz = Math.abs(p.z - pt.z)
        if (dx < bestX) { bestX = dx; x = p.x }
        if (dz < bestZ) { bestZ = dz; z = p.z }
    }
    return { x, z }
}

export function snapPoint(x: number, z: number, shiftHeld: boolean, lastPoint: Vec2 | null): Vec2 {
    const sx = snapToGrid(x)
    const sz = snapToGrid(z)
    if (!shiftHeld || !lastPoint) return { x: sx, z: sz }

    // Axis-lock: constrain to the dominant axis from the last placed point
    const dx = Math.abs(sx - lastPoint.x)
    const dz = Math.abs(sz - lastPoint.z)
    return dx >= dz
        ? { x: sx, z: lastPoint.z } // horizontal
        : { x: lastPoint.x, z: sz } // vertical
}
