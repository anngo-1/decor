'use client'

import { useRef } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { useStore } from '@/store/useStore'
import { ArrowUpRight, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { formatDim } from '@/utils/format'
import { runEngineCommand } from '@/engine/core/commands'

export function ItemSettingsSection({ itemId }: { itemId: string }) {
    const placedItems = useStore((s) => s.placedItems)

    const item = placedItems.find((it) => it.id === itemId)
    const scaleDirtyRef = useRef(false)
    const widthDirtyRef = useRef(false)
    const heightDirtyRef = useRef(false)
    const elevationDirtyRef = useRef(false)

    if (!item) return null

    const rotate = (delta: number) => {
        const [rx, ry, rz] = item.rotation
        runEngineCommand({ type: 'updateItemRotation', itemId: item.id, rotation: [rx, ry + delta, rz] })
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header Info */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{item.isWindow ? 'Window' : (item.isGenerated ? 'Generated' : 'Library Item')}</span>
                <span className="text-sm font-black text-indigo-950 leading-tight">{item.name}</span>

                {item.price && !item.isWindow && (
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

                {item.dimensions && !item.isWindow && (
                    <div className="flex items-center justify-between bg-indigo-50/50 px-3 py-2 rounded-xl">
                        <span className="text-xs font-bold text-indigo-400">Dimensions</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-950 font-bold tracking-tight bg-white px-2 py-0.5 rounded shadow-sm border border-indigo-100">
                            <span>{formatDim(item.dimensions[0])} × {formatDim(item.dimensions[1])} × {formatDim(item.dimensions[2])}</span>
                        </div>
                    </div>
                )}

                {/* Scale */}
                {!item.isWindow && (
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-indigo-400">Scale</span>
                            <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">{item.scale.toFixed(2)}x</span>
                        </div>
                            <Slider.Root
                                className="relative flex items-center select-none touch-none w-full h-5"
                                value={[item.scale]}
                                min={0.1} max={5.0} step={0.05}
                                onValueChange={([v]) => {
                                    scaleDirtyRef.current = true
                                    runEngineCommand({ type: 'updateItemScale', itemId: item.id, scale: v, noCommit: true })
                                }}
                                onValueCommit={([v]) => {
                                    if (!scaleDirtyRef.current) return
                                    scaleDirtyRef.current = false
                                    runEngineCommand({ type: 'updateItemScale', itemId: item.id, scale: v })
                                }}
                            >
                            <Slider.Track className="bg-indigo-100 relative grow rounded-full h-1.5">
                                <Slider.Range className="absolute bg-indigo-400 rounded-full h-full" />
                            </Slider.Track>
                            <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-indigo-500 shadow-md rounded-full hover:scale-110 transition-transform focus:outline-none" />
                        </Slider.Root>
                    </div>
                )}

                {/* Window Specific Properties */}
                {item.isWindow && item.windowSize && (
                    <>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-indigo-400">Width</span>
                                <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">{item.windowSize.width.toFixed(2)}m</span>
                            </div>
                            <Slider.Root
                                className="relative flex items-center select-none touch-none w-full h-5"
                                value={[item.windowSize.width]}
                                min={0.3} max={4.0} step={0.1}
                                onValueChange={([v]) => {
                                    widthDirtyRef.current = true
                                    runEngineCommand({ type: 'updateWindowSize', itemId: item.id, width: v, height: item.windowSize!.height, noCommit: true })
                                }}
                                onValueCommit={([v]) => {
                                    if (!widthDirtyRef.current) return
                                    widthDirtyRef.current = false
                                    runEngineCommand({ type: 'updateWindowSize', itemId: item.id, width: v, height: item.windowSize!.height })
                                }}
                            >
                                <Slider.Track className="bg-indigo-100 relative grow rounded-full h-1.5">
                                    <Slider.Range className="absolute bg-indigo-400 rounded-full h-full" />
                                </Slider.Track>
                                <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-indigo-500 shadow-md rounded-full hover:scale-110 transition-transform focus:outline-none" />
                            </Slider.Root>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-indigo-400">Height</span>
                                <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">{item.windowSize.height.toFixed(2)}m</span>
                            </div>
                            <Slider.Root
                                className="relative flex items-center select-none touch-none w-full h-5"
                                value={[item.windowSize.height]}
                                min={0.3} max={3.0} step={0.1}
                                onValueChange={([v]) => {
                                    heightDirtyRef.current = true
                                    runEngineCommand({ type: 'updateWindowSize', itemId: item.id, width: item.windowSize!.width, height: v, noCommit: true })
                                }}
                                onValueCommit={([v]) => {
                                    if (!heightDirtyRef.current) return
                                    heightDirtyRef.current = false
                                    runEngineCommand({ type: 'updateWindowSize', itemId: item.id, width: item.windowSize!.width, height: v })
                                }}
                            >
                                <Slider.Track className="bg-indigo-100 relative grow rounded-full h-1.5">
                                    <Slider.Range className="absolute bg-indigo-400 rounded-full h-full" />
                                </Slider.Track>
                                <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-indigo-500 shadow-md rounded-full hover:scale-110 transition-transform focus:outline-none" />
                            </Slider.Root>
                        </div>
                    </>
                )}

                {/* Elevation */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-400">{item.isWindow ? 'Center Elevation' : 'Elevation'}</span>
                        <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">{item.position[1].toFixed(2)}m</span>
                    </div>
                    <Slider.Root
                        className="relative flex items-center select-none touch-none w-full h-5"
                        value={[item.position[1]]}
                        min={0} max={3.5} step={0.05}
                        onValueChange={([v]) => {
                            elevationDirtyRef.current = true
                            runEngineCommand({ type: 'updateItemPosition', itemId: item.id, position: [item.position[0], v, item.position[2]], noCommit: true })
                        }}
                        onValueCommit={([v]) => {
                            if (!elevationDirtyRef.current) return
                            elevationDirtyRef.current = false
                            runEngineCommand({ type: 'updateItemPosition', itemId: item.id, position: [item.position[0], v, item.position[2]] })
                        }}
                    >
                        <Slider.Track className="bg-indigo-100 relative grow rounded-full h-1.5">
                            <Slider.Range className="absolute bg-indigo-400 rounded-full h-full" />
                        </Slider.Track>
                        <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-indigo-500 shadow-md rounded-full hover:scale-110 transition-transform focus:outline-none" />
                    </Slider.Root>
                </div>

                {/* Rotation */}
                {!item.isWindow && (
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
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-red-100">
                <button
                    onClick={() => runEngineCommand({ type: 'removeItem', itemId: item.id })}
                    className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors font-bold text-xs"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Item
                </button>
            </div>
        </div>
    )
}
