'use client'

import { useRef } from 'react'
import { useStore } from '@/store/useStore'
import { Trash2, Zap, Maximize } from 'lucide-react'
import { SliderRow } from './SliderRow'
import { runEngineCommand } from '@/engine/core/commands'

const LIGHT_COLORS = [
    '#ffffff', // Cool White
    '#fff4e6', // Warm White
    '#fef08a', // Yellow
    '#fed7aa', // Orange
    '#fecaca', // Red
    '#e9d5ff', // Purple
    '#bfdbfe', // Blue
    '#bbf7d0', // Green
]

const POSITION_AXES = [
    { axis: 'x', index: 0 as const },
    { axis: 'y', index: 1 as const },
    { axis: 'z', index: 2 as const },
]


export function LightSettingsSection({ lightId }: { lightId: string }) {
    const placedLights = useStore((s) => s.placedLights)

    const light = placedLights.find(l => l.id === lightId)
    const intensityDirtyRef = useRef(false)
    const distanceDirtyRef = useRef(false)

    if (!light) return null

    const updatePositionAxis = (axisIdx: 0 | 1 | 2, raw: string, noCommit: boolean) => {
        const parsed = Number.parseFloat(raw)
        if (Number.isNaN(parsed)) return
        if (parsed === light.position[axisIdx]) return
        const newPos: [number, number, number] = [...light.position]
        newPos[axisIdx] = parsed
        runEngineCommand({ type: 'updateLight', lightId: light.id, update: { position: newPos }, noCommit })
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header Info */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Environment</span>
                <span className="text-sm font-black text-indigo-950 leading-tight">Point Light</span>
            </div>

            <div className="h-px bg-indigo-50" />

            {/* Position XYZ */}
            <div className="flex flex-col gap-3">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Coordinates</span>

                <div className="flex gap-1.5">
                    {POSITION_AXES.map(({ axis, index: axisIdx }) => (
                        <div key={axis} className="flex-1 bg-indigo-50/50 rounded-xl px-2 py-2 flex flex-col items-center gap-1 border border-indigo-50">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${axis === 'x' ? 'text-red-400' : axis === 'y' ? 'text-emerald-500' : 'text-blue-400'}`}>
                                {axis}
                            </span>
                            <div className="bg-white border-b border-indigo-100/60 shadow-sm w-full rounded flex justify-center py-0.5">
                                <input
                                    type="number"
                                    step={0.5}
                                    value={light.position[axisIdx].toFixed(2)}
                                    onChange={(e) => updatePositionAxis(axisIdx, e.target.value, true)}
                                    onBlur={(e) => updatePositionAxis(axisIdx, e.target.value, false)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                    className="w-full text-center text-xs font-bold text-indigo-900 bg-transparent outline-none tabular-nums"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-indigo-50" />

            {/* Properties */}
            <div className="flex flex-col gap-5">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Light Properties</span>

                {/* Colors */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-indigo-400">Bulb Color</span>
                    <div className="flex gap-2 flex-wrap bg-indigo-50/50 p-2 rounded-xl border border-indigo-50">
                        {LIGHT_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => runEngineCommand({ type: 'updateLight', lightId: light.id, update: { color } })}
                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${light.color === color ? 'border-indigo-500 scale-110 shadow-md' : 'border-white shadow-sm'}`}
                                style={{ backgroundColor: color }}
                                title={`Set color: ${color}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Intensity */}
                <div className="flex flex-col gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-50">
                    <span className="text-xs font-bold text-indigo-950 mb-1">Intensity</span>
                    <SliderRow
                        icon={<Zap className="h-4 w-4 text-amber-500" />}
                        value={light.intensity}
                        min={0} max={50} step={0.5}
                        onChange={(v) => {
                            intensityDirtyRef.current = true
                            runEngineCommand({ type: 'updateLight', lightId: light.id, update: { intensity: v }, noCommit: true })
                        }}
                        onCommit={(v) => {
                            if (!intensityDirtyRef.current) return
                            intensityDirtyRef.current = false
                            runEngineCommand({ type: 'updateLight', lightId: light.id, update: { intensity: v } })
                        }}
                        label={light.intensity.toFixed(1)}
                    />
                </div>

                {/* Range */}
                <div className="flex flex-col gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-50">
                    <span className="text-xs font-bold text-indigo-950 mb-1">Illumination Range</span>
                    <SliderRow
                        icon={<Maximize className="h-4 w-4 text-indigo-400" />}
                        value={light.distance}
                        min={1} max={50} step={0.5}
                        onChange={(v) => {
                            distanceDirtyRef.current = true
                            runEngineCommand({ type: 'updateLight', lightId: light.id, update: { distance: v }, noCommit: true })
                        }}
                        onCommit={(v) => {
                            if (!distanceDirtyRef.current) return
                            distanceDirtyRef.current = false
                            runEngineCommand({ type: 'updateLight', lightId: light.id, update: { distance: v } })
                        }}
                        label={`${light.distance.toFixed(0)}m`}
                    />
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-red-100">
                <button
                    onClick={() => runEngineCommand({ type: 'removeLight', lightId: light.id })}
                    className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors font-bold text-xs"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Light
                </button>
            </div>
        </div>
    )
}
