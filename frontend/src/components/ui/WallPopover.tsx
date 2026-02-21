'use client'

import { useStore } from '@/store/useStore'
import { Trash2, X } from 'lucide-react'

function formatDim(meters: number) {
    if (meters < 1) return `${Math.round(meters * 100)}cm`
    return `${meters.toFixed(1)}m`
}

const WALL_COLORS = [
    '#c8c4bc', // Default beige/grey
    '#e0ddd7', // Lighter
    '#b4b0a8', // Darker
    '#f5f5f0', // Off-white
    '#9ea4a8', // Cool grey
    '#b5a49c', // Warm taupe
    '#a8b5cc', // Slate blue
    '#dcd4cd', // Blush
    '#9ca495', // Sage green
]

export function WallPopover() {
    const selectedWallId = useStore((s) => s.selectedWallId)
    const roomPolygons = useStore((s) => s.roomPolygons)
    const selectWall = useStore((s) => s.selectWall)
    const updateWallColor = useStore((s) => s.updateWallColor)
    const deleteWallSegment = useStore((s) => s.deleteWallSegment)

    if (!selectedWallId) return null

    const [polyId, segIdxStr] = selectedWallId.split('-')
    const segmentIndex = parseInt(segIdxStr, 10)

    const poly = roomPolygons.find((p) => p.id === polyId)
    if (!poly) return null

    const currentColor = poly.segmentProps?.[segmentIndex]?.color || '#c8c4bc'

    // Calculate segment length
    let lengthDisplay = ''
    try {
        const p1 = poly.points[segmentIndex]
        const p2Idx = (segmentIndex + 1) % poly.points.length
        // If it's an open polygon and we're clicking the last point (which shouldn't be a valid segment),
        // we guard against it. But typically 'segmentIndex' for open polys only goes up to len-2.
        if (p1 && poly.points[p2Idx]) {
            const p2 = poly.points[p2Idx]
            const dx = p2.x - p1.x
            const dz = p2.z - p1.z
            const dist = Math.sqrt(dx * dx + dz * dz)
            lengthDisplay = formatDim(dist)
        }
    } catch (e) {
        // Fallback if measurement fails
    }

    return (
        <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3 px-5 py-3
        bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-3xl shadow-2xl shadow-indigo-100/50
        animate-pop"
        >
            <div className="flex flex-col mr-2">
                <span className="text-sm font-bold text-indigo-950">Wall Segment</span>
                {lengthDisplay && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-indigo-400 font-bold tracking-tight" title="Segment length">
                        <span>{lengthDisplay}</span>
                    </div>
                )}
            </div>

            <div className="h-7 w-px bg-indigo-100 mx-1" />

            {/* Color Swatches */}
            <div className="flex items-center gap-1.5">
                {WALL_COLORS.map((color) => (
                    <button
                        key={color}
                        onClick={() => updateWallColor(polyId, segmentIndex, color)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === color ? 'border-indigo-600 scale-110 shadow-lg shadow-indigo-200' : 'border-indigo-50'
                            }`}
                        style={{ backgroundColor: color }}
                        title={`Set color: ${color}`}
                    />
                ))}
            </div>

            <div className="h-7 w-px bg-indigo-100 mx-1" />

            {/* Delete */}
            <button
                onClick={() => deleteWallSegment(polyId, segmentIndex)}
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-red-50 text-indigo-300 hover:text-red-500 transition-colors"
                title="Remove wall segment"
            >
                <Trash2 className="h-4 w-4" />
            </button>

            {/* Close */}
            <button
                onClick={() => selectWall(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-indigo-50 text-indigo-300 hover:text-indigo-600 transition-colors"
                title="Deselect"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}
