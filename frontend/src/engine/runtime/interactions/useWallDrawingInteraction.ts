import { useCallback, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Vec2 } from '@/types'
import { useStore } from '@/store/useStore'
import { applyAlignmentSnap, snapPoint, snapToPoint } from '@/utils/grid'

const DRAG_THRESHOLD_PX = 5

export function useWallDrawingInteraction() {
    const activeTool = useStore((s) => s.activeTool)
    const isDrawingWall = useStore((s) => s.isDrawingWall)
    const addWallPoint = useStore((s) => s.addWallPoint)
    const currentWallPoints = useStore((s) => s.currentWallPoints)
    const roomPolygons = useStore((s) => s.roomPolygons)
    const setHoverPoint = useStore((s) => s.setHoverPoint)

    const downPosRef = useRef<{ x: number; y: number } | null>(null)
    const active = activeTool === 'wall' && isDrawingWall

    const snapCandidates = useMemo(() => {
        const points: Vec2[] = []
        roomPolygons.forEach((poly) => points.push(...poly.points))
        currentWallPoints.slice(0, -1).forEach((p) => points.push(p))
        return points
    }, [roomPolygons, currentWallPoints])

    const resolveSnap = useCallback((x: number, z: number, shiftHeld: boolean): Vec2 => {
        const pointHit = snapToPoint(x, z, snapCandidates)
        if (pointHit) return pointHit
        const gridPt = snapPoint(x, z, shiftHeld, currentWallPoints.at(-1) ?? null)
        return applyAlignmentSnap(gridPt, snapCandidates)
    }, [snapCandidates, currentWallPoints])

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!active) return
        setHoverPoint(resolveSnap(e.point.x, e.point.z, e.shiftKey))
    }, [active, resolveSnap, setHoverPoint])

    const handlePointerLeave = useCallback(() => {
        setHoverPoint(null)
    }, [setHoverPoint])

    const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!active) return
        downPosRef.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    }, [active])

    const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!active || !downPosRef.current) return

        const dx = e.nativeEvent.clientX - downPosRef.current.x
        const dy = e.nativeEvent.clientY - downPosRef.current.y
        downPosRef.current = null
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) return

        e.stopPropagation()
        const point = resolveSnap(e.point.x, e.point.z, e.shiftKey)

        if (currentWallPoints.length === 1) {
            useStore.getState().addWallSegment([...currentWallPoints, point])
            return
        }

        addWallPoint(point)
    }, [active, currentWallPoints, resolveSnap, addWallPoint])

    return {
        active,
        handlePointerMove,
        handlePointerLeave,
        handlePointerDown,
        handlePointerUp,
    }
}
