'use client'

import { CheckCircle, Loader2, AlertCircle, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import type { GenerationTask } from '@/types'

function TaskRow({ task }: { task: GenerationTask }) {
    const icon = {
        queued: <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300" />,
        processing: <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />,
        completed: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
        failed: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
    }[task.status]

    const label = {
        queued: 'Queued',
        processing: `${task.progress ?? 0}%`,
        completed: 'Done',
        failed: 'Failed',
    }[task.status]

    return (
        <div className="flex items-center gap-2">
            {icon}
            <span className="text-[11px] text-indigo-900 font-medium truncate max-w-[120px]">{task.name}</span>
            <span className={`text-[10px] font-bold ml-auto ${task.status === 'completed' ? 'text-emerald-600' :
                task.status === 'failed' ? 'text-red-600' :
                    task.status === 'processing' ? 'text-indigo-600' : 'text-indigo-300'
                }`}>{label}</span>
        </div>
    )
}

export function StatusBar() {
    const generationTasks = useStore((s) => s.generationTasks)
    const activeTasks = generationTasks.filter((t) => t.status === 'queued' || t.status === 'processing')

    const activeTool = useStore((s) => s.activeTool)
    const isDrawingWall = useStore((s) => s.isDrawingWall)
    const currentWallPoints = useStore((s) => s.currentWallPoints)
    const cancelWallDrawing = useStore((s) => s.cancelWallDrawing)
    const closeWallPolygon = useStore((s) => s.closeWallPolygon)
    const measureDistance = useStore((s) => s.measureDistance)

    const placedItems = useStore((s) => s.placedItems)

    const recentTasks = activeTasks.slice(0, 3)

    return (
        <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2 items-end">


            {/* Generation tasks panel */}
            {recentTasks.length > 0 && (
                <div className="w-56 bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-2xl p-4 space-y-2 shadow-2xl shadow-indigo-100/50">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400">AI Generation</span>
                    </div>
                    {recentTasks.map((t) => <TaskRow key={t.taskId} task={t} />)}
                </div>
            )}

            <div className="flex items-center gap-2">


                {/* Context hint bar */}
                <div className="bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-2xl px-4 py-3 shadow-2xl shadow-indigo-100/50">
                    {activeTool === 'wall' && isDrawingWall && (
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-indigo-400">
                                {currentWallPoints.length === 0
                                    ? 'Click to place first wall point'
                                    : currentWallPoints.length < 3
                                        ? `${currentWallPoints.length} point${currentWallPoints.length > 1 ? 's' : ''} — keep clicking`
                                        : 'Click near start to close the room'}
                            </span>
                            {currentWallPoints.length >= 3 && (
                                <button
                                    onClick={closeWallPolygon}
                                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase tracking-wider"
                                >
                                    Close ✓
                                </button>
                            )}
                            <button
                                onClick={cancelWallDrawing}
                                className="text-[11px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    {activeTool === 'select' && (
                        <span className="text-xs font-medium text-indigo-300">
                            Drag items onto floor · Click objects to select · Orbit to navigate
                        </span>
                    )}
                    {activeTool === 'measure' && (
                        <span className="text-xs font-medium text-indigo-400">
                            {measureDistance !== null
                                ? `Distance: ${measureDistance.toFixed(2)}m`
                                : 'Click two points on the floor to measure'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
