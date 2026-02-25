'use client'

import * as Slider from '@radix-ui/react-slider'
import { useStore } from '@/store/useStore'
import { ArrowUpRight, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { formatDim } from '@/utils/format'

export function ItemSettingsSection({ itemId }: { itemId: string }) {
    const placedItems = useStore((s) => s.placedItems)
    const updateItemRotation = useStore((s) => s.updateItemRotation)
    const updateItemScale = useStore((s) => s.updateItemScale)
    const updateItemPosition = useStore((s) => s.updateItemPosition)
    const removeItem = useStore((s) => s.removeItem)

    const item = placedItems.find((it) => it.id === itemId)
    if (!item) return null

    const rotate = (delta: number) => {
        const [rx, ry, rz] = item.rotation
        updateItemRotation(item.id, [rx, ry + delta, rz])
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header Info */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{item.isGenerated ? 'Generated' : 'Library Item'}</span>
                <span className="text-sm font-black text-indigo-950 leading-tight">{item.name}</span>

                {item.price && (
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm text-indigo-600 font-black">
                            ${item.price.toLocaleString()}
                        </span>
                        {item.affiliateUrl && item.affiliateUrl !== '#' && (
                            <a
                                href={item.affiliateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100/50"
                            >
                                <span>View Product</span>
                                <ArrowUpRight className="h-2.5 w-2.5" />
                            </a>
                        )}
                    </div>
                )}
            </div>

            <div className="h-px bg-indigo-50" />

            {/* Transform Properties */}
            <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Transform</span>

                {item.dimensions && (
                    <div className="flex items-center justify-between bg-indigo-50/50 px-3 py-2 rounded-xl">
                        <span className="text-xs font-bold text-indigo-400">Dimensions</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-950 font-bold tracking-tight bg-white px-2 py-0.5 rounded shadow-sm border border-indigo-100">
                            <span>{formatDim(item.dimensions[0])} × {formatDim(item.dimensions[1])} × {formatDim(item.dimensions[2])}</span>
                        </div>
                    </div>
                )}

                {/* Scale */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-400">Scale</span>
                        <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">{item.scale.toFixed(2)}x</span>
                    </div>
                    <Slider.Root
                        className="relative flex items-center select-none touch-none w-full h-5"
                        value={[item.scale]}
                        min={0.1} max={5.0} step={0.05}
                        onValueChange={([v]) => updateItemScale(item.id, v)}
                    >
                        <Slider.Track className="bg-indigo-100 relative grow rounded-full h-1.5">
                            <Slider.Range className="absolute bg-indigo-400 rounded-full h-full" />
                        </Slider.Track>
                        <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-indigo-500 shadow-md rounded-full hover:scale-110 transition-transform focus:outline-none" />
                    </Slider.Root>
                </div>

                {/* Elevation */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-400">Elevation</span>
                        <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">{item.position[1].toFixed(2)}m</span>
                    </div>
                    <Slider.Root
                        className="relative flex items-center select-none touch-none w-full h-5"
                        value={[item.position[1]]}
                        min={0} max={3.5} step={0.05}
                        onValueChange={([v]) => updateItemPosition(item.id, [item.position[0], v, item.position[2]])}
                    >
                        <Slider.Track className="bg-indigo-100 relative grow rounded-full h-1.5">
                            <Slider.Range className="absolute bg-indigo-400 rounded-full h-full" />
                        </Slider.Track>
                        <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-indigo-500 shadow-md rounded-full hover:scale-110 transition-transform focus:outline-none" />
                    </Slider.Root>
                </div>

                {/* Rotation */}
                <div className="flex justify-between items-center bg-indigo-50/50 p-1.5 rounded-xl">
                    <span className="text-xs font-bold text-indigo-400 px-2 pl-2">Rotation</span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => rotate(-Math.PI / 8)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-indigo-100 hover:border-indigo-300 hover:text-indigo-600 text-indigo-400 transition-all"
                            title="Rotate left"
                        >
                            <RotateCcw className="h-3 w-3" />
                        </button>
                        <button
                            onClick={() => rotate(Math.PI / 8)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-indigo-100 hover:border-indigo-300 hover:text-indigo-600 text-indigo-400 transition-all"
                            title="Rotate right"
                        >
                            <RotateCw className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-red-100">
                <button
                    onClick={() => removeItem(item.id)}
                    className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors font-bold text-xs"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Item
                </button>
            </div>
        </div>
    )
}
