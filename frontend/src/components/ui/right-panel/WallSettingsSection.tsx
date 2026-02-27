'use client'

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Trash2 } from 'lucide-react'
import { formatDim } from '@/utils/format'

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

export function WallSettingsSection({ wallId }: { wallId: string }) {
    const roomPolygons = useStore((s) => s.roomPolygons)
    const wallHeight = useStore((s) => s.wallHeight)
    const updateWallColor = useStore((s) => s.updateWallColor)
    const updateWallHeight = useStore((s) => s.updateWallHeight)
    const deleteWallSegment = useStore((s) => s.deleteWallSegment)

    const [heightInput, setHeightInput] = useState<string | null>(null)

    const [polyId, segIdxStr] = wallId.split('-')
    const segmentIndex = parseInt(segIdxStr, 10)

    const poly = roomPolygons.find((p) => p.id === polyId)
    if (!poly) return null

    const segProps = poly.segmentProps?.[segmentIndex]
    const currentColor = segProps?.color || '#c8c4bc'
    const currentHeight = segProps?.height ?? wallHeight

    const commitHeight = (raw: string) => {
        setHeightInput(null)
        const parsed = parseFloat(raw)
        if (!isNaN(parsed)) updateWallHeight(polyId, segmentIndex, Math.min(6.0, Math.max(0.5, parsed)))
    }

    let lengthDisplay = ''
    const p1 = poly.points[segmentIndex]
    const p2 = poly.points[(segmentIndex + 1) % poly.points.length]
    if (p1 && p2) {
        const dx = p2.x - p1.x
        const dz = p2.z - p1.z
        lengthDisplay = formatDim(Math.sqrt(dx * dx + dz * dz))
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header Info */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Architecture</span>
                <span className="text-sm font-black text-indigo-950 leading-tight">Wall Segment</span>
            </div>

            <div className="h-px bg-indigo-50" />

            <div className="flex flex-col gap-3">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Dimensions</span>

                {lengthDisplay && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400">Length</span>
                        <span className="text-xs font-bold text-indigo-900">{lengthDisplay}</span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">Height</span>
                    <div className="flex items-center gap-1.5">
                        <input
                            type="number"
                            min={0.5} max={6.0} step={0.1}
                            value={heightInput ?? currentHeight.toFixed(1)}
                            onChange={(e) => setHeightInput(e.target.value)}
                            onBlur={(e) => commitHeight(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                            className="w-14 text-center text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                        />
                        <span className="text-xs text-indigo-400">m</span>
                    </div>
                </div>
            </div>

            <div className="h-px bg-indigo-50" />

            {/* Colors */}
            <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Paint Color</span>

                <div className="flex items-center gap-2 flex-wrap">
                    {WALL_COLORS.map((color) => (
                        <button
                            key={color}
                            onClick={() => updateWallColor(polyId, segmentIndex, color)}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === color ? 'border-indigo-500 scale-110 shadow-lg shadow-indigo-200' : 'border-indigo-100/50 shadow-sm'
                                }`}
                            style={{ backgroundColor: color }}
                            title={`Set color: ${color}`}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-red-100">
                <button
                    onClick={() => deleteWallSegment(polyId, segmentIndex)}
                    className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors font-bold text-xs"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Segment
                </button>
            </div>
        </div>
    )
}
