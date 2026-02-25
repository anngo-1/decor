'use client'

import * as Slider from '@radix-ui/react-slider'

export function SliderRow({
    icon, value, min, max, step, onChange, label,
}: {
    icon: React.ReactNode
    value: number
    min: number
    max: number
    step: number
    onChange: (v: number) => void
    label: string
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="shrink-0 text-indigo-300">{icon}</span>
            <Slider.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                value={[value]}
                min={min} max={max} step={step}
                onValueChange={([v]) => onChange(v)}
            >
                <Slider.Track className="bg-indigo-100 relative grow rounded-full h-1.5">
                    <Slider.Range className="absolute bg-indigo-400 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-indigo-500 shadow-md rounded-full hover:scale-110 transition-transform focus:outline-none" />
            </Slider.Root>
            <span className="text-[10px] font-bold text-indigo-500 w-8 tabular-nums shrink-0 text-right bg-indigo-50 px-1.5 py-0.5 rounded">{label}</span>
        </div>
    )
}
