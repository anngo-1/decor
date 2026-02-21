'use client'

import * as Popover from '@radix-ui/react-popover'
import {
    RotateCcw,
    RotateCw,
    Trash2,
    ArrowUpRight,
    X,
    DollarSign,
    Box
} from 'lucide-react'
import { useStore } from '@/store/useStore'

function formatDim(meters: number) {
    if (meters < 1) return `${Math.round(meters * 100)}cm`
    return `${meters.toFixed(1)}m`
}

export function ItemPopover() {
    const selectedItemId = useStore((s) => s.selectedItemId)
    const placedItems = useStore((s) => s.placedItems)
    const updateItemRotation = useStore((s) => s.updateItemRotation)
    const updateItemScale = useStore((s) => s.updateItemScale)
    const updateItemPosition = useStore((s) => s.updateItemPosition)
    const removeItem = useStore((s) => s.removeItem)
    const selectItem = useStore((s) => s.selectItem)

    const selectedItem = placedItems.find((it) => it.id === selectedItemId) ?? null

    const rotate = (delta: number) => {
        if (!selectedItem) return
        const [rx, ry, rz] = selectedItem.rotation
        updateItemRotation(selectedItem.id, [rx, ry + delta, rz])
    }

    if (!selectedItem) return null

    return (
        <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 px-6 py-4
        bg-white/95 backdrop-blur-xl border border-indigo-100 rounded-[2rem] shadow-2xl shadow-indigo-100/60
        animate-pop"
        >
            {/* Item name */}
            <div className="flex flex-col mr-2">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-black text-indigo-950 truncate max-w-[140px]">{selectedItem.name}</span>
                </div>
                {selectedItem.price && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-indigo-600 font-black">
                            ${selectedItem.price.toLocaleString()}
                        </span>
                        {selectedItem.affiliateUrl && selectedItem.affiliateUrl !== '#' && (
                            <a
                                href={selectedItem.affiliateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors bg-indigo-50/50 px-2 py-0.5 rounded-md"
                            >
                                <span>View Product</span>
                                <ArrowUpRight className="h-2.5 w-2.5" />
                            </a>
                        )}
                    </div>
                )}
            </div>

            {/* Dimensions readout and scaling slider */}
            <div className="flex flex-col gap-1 items-center px-4 border-r border-indigo-100 pr-5">
                {selectedItem.dimensions && (
                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-bold tracking-tight" title="Exact object bounds (W × H × D)">
                        <Box className="h-3 w-3 text-indigo-500" />
                        <span>{formatDim(selectedItem.dimensions[0])} × {formatDim(selectedItem.dimensions[1])} × {formatDim(selectedItem.dimensions[2])}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-indigo-300 font-bold w-8 text-right pr-0.5">{selectedItem.scale.toFixed(2)}x</span>
                    <input
                        type="range"
                        min="0.1"
                        max="5.0"
                        step="0.05"
                        value={selectedItem.scale}
                        onChange={(e) => updateItemScale(selectedItem.id, parseFloat(e.target.value))}
                        className="w-20 h-1 bg-indigo-50 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        title="Adjust scale"
                    />
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-indigo-300 font-bold w-8 text-right pr-0.5">{selectedItem.position[1].toFixed(2)}m</span>
                    <input
                        type="range"
                        min="0"
                        max="3.5"
                        step="0.05"
                        value={selectedItem.position[1]}
                        onChange={(e) => updateItemPosition(selectedItem.id, [selectedItem.position[0], parseFloat(e.target.value), selectedItem.position[2]])}
                        className="w-20 h-1 bg-indigo-50 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        title="Adjust elevation (Y-axis)"
                    />
                </div>
            </div>

            {/* Rotation */}
            <button
                onClick={() => rotate(-Math.PI / 8)}
                className="popover-btn flex h-9 w-9 items-center justify-center rounded-xl hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition-colors"
                title="Rotate left"
            >
                <RotateCcw className="h-4 w-4" />
            </button>
            <button
                onClick={() => rotate(Math.PI / 8)}
                className="popover-btn flex h-9 w-9 items-center justify-center rounded-xl hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition-colors"
                title="Rotate right"
            >
                <RotateCw className="h-4 w-4" />
            </button>

            <div className="h-7 w-px bg-indigo-100 mx-1" />

            {/* Delete */}
            <button
                onClick={() => removeItem(selectedItem.id)}
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-red-50 text-indigo-300 hover:text-red-500 transition-colors"
                title="Remove item"
            >
                <Trash2 className="h-4 w-4" />
            </button>

            {/* Close */}
            <button
                onClick={() => selectItem(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-indigo-50 text-indigo-300 hover:text-indigo-600 transition-colors"
                title="Deselect"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}
