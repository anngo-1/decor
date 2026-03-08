'use client'

import { useStore } from '@/store/useStore'
import { Plus, Lightbulb, Trash2, Sun } from 'lucide-react'
import { SliderRow } from './SliderRow'
import { ENVIRONMENTS } from '@/engine/config/environment'
import { runEngineCommand } from '@/engine/core/commands'


export function RoomSettingsSection() {
    const environmentPreset = useStore((s) => s.environmentPreset)

    const shadowsEnabled = useStore((s) => s.shadowsEnabled)
    const sunIntensity = useStore((s) => s.sunIntensity)

    const placedLights = useStore((s) => s.placedLights)

    const handleAddLight = () => {
        runEngineCommand({
            type: 'placeLight',
            light: { position: [0, 2.5, 0], color: '#fff4e6', intensity: 3, distance: 8 },
            selectPlaced: true,
        })
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in">

            {/* Environment Settings */}
            <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Atmosphere</span>

                <div className="flex gap-1.5 bg-indigo-50/50 p-1.5 rounded-xl">
                    {ENVIRONMENTS.map((env) => (
                        <button
                            key={env.id}
                            onClick={() => runEngineCommand({ type: 'setEnvironmentPreset', preset: env.id })}
                            className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-all flex-1 border-2
                                ${environmentPreset === env.id
                                    ? 'bg-white border-indigo-400 shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-white/60'}`}
                            title={env.name}
                        >
                            <div
                                className="w-5 h-5 rounded-full border border-black/5 shadow-sm"
                                style={{ backgroundColor: env.color }}
                            />
                            <span className={`text-[8px] font-black uppercase tracking-wider leading-none ${environmentPreset === env.id ? 'text-indigo-600' : 'text-indigo-400'}`}>
                                {env.name}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-3 bg-indigo-50/50 p-3 rounded-xl mt-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-950">Ambient Light</span>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => runEngineCommand({ type: 'toggleShadows' })}
                                className={`text-[9px] font-black px-2 py-1 rounded-md border transition-all ${shadowsEnabled
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-200'
                                    : 'bg-white border-indigo-200 text-indigo-400 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
                                    }`}
                            >
                                {shadowsEnabled ? 'Shadows On' : 'Shadows Off'}
                            </button>
                        </div>
                    </div>
                    <SliderRow
                        icon={<Sun className="h-4 w-4 text-amber-500" />}
                        value={sunIntensity}
                        min={0} max={20} step={0.1}
                        onChange={(v) => runEngineCommand({ type: 'setLighting', lighting: { intensity: v } })}
                        label={sunIntensity.toFixed(1)}
                    />
                </div>
            </div>

            <div className="h-px bg-indigo-50" />

            {/* Point Lights */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Custom Lights</span>
                    <button
                        onClick={handleAddLight}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm shadow-indigo-200"
                    >
                        <Plus className="h-3 w-3" />
                        Add Light
                    </button>
                </div>

                {placedLights.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-indigo-300 bg-indigo-50/50 rounded-xl border border-dashed border-indigo-100">
                        <Lightbulb className="h-6 w-6 text-indigo-200" />
                        <span className="text-[11px] font-medium text-center opacity-80">No custom lights.<br />Click &apos;Add Light&apos; to place one.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {placedLights.map((light, i) => (
                            <div key={light.id} className="flex flex-col rounded-xl overflow-hidden border border-indigo-100 bg-white hover:border-indigo-300 transition-colors shadow-sm">
                                <div className="flex items-center gap-3 px-3 py-2.5 w-full">
                                    <div
                                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm shrink-0"
                                        style={{ backgroundColor: light.color }}
                                    />
                                    <span className="text-xs font-bold text-indigo-950 flex-1">Point Light {i + 1}</span>

                                    <button
                                        onClick={() => runEngineCommand({ type: 'selectLight', lightId: light.id })}
                                        className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <div className="w-px h-4 bg-indigo-100 mx-0.5" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); runEngineCommand({ type: 'removeLight', lightId: light.id }) }}
                                        className="flex h-6 w-6 items-center justify-center rounded-md text-indigo-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        title="Delete light"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    )
}
