'use client'

import Link from 'next/link'
import { useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
    MousePointer2,
    Square,
    Sparkles,
    Trash2,
    PanelLeftClose,
    PanelLeftOpen,
    Layers3,
    Sun,
    SunDim,
    Undo2,
    Redo2,
    Glasses,
    Save,
    Film,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { SaveDialog } from './SaveDialog'

interface ToolButtonProps {
    icon: React.ReactNode
    label: string
    active?: boolean
    danger?: boolean
    disabled?: boolean
    onClick?: () => void
    badge?: number
}

function ToolButton({ icon, label, active, danger, disabled, onClick, badge }: ToolButtonProps) {
    return (
        <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    <button
                        disabled={disabled}
                        className={`
              relative flex h-9 w-9 items-center justify-center rounded-lg
              transition-all duration-150 outline-none border border-transparent
              ${disabled
                                ? 'opacity-30 cursor-not-allowed text-indigo-300'
                                : active
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border-indigo-500'
                                    : danger
                                        ? 'text-red-400 hover:bg-red-50 hover:text-red-600 border-red-100 hover:border-red-200'
                                        : 'text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 border-transparent hover:border-indigo-100'}
            `}
                        onClick={onClick}
                    >
                        {icon}
                        {badge != null && badge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-500 text-[9px] font-bold text-white">
                                {badge}
                            </span>
                        )}
                    </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        side="bottom"
                        className="z-50 rounded-xl bg-indigo-950 px-3 py-1.5 text-xs font-bold text-white shadow-xl border border-indigo-800"
                    >
                        {label}
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    )
}

const Divider = () => <div className="h-4 w-px bg-indigo-100 mx-1" />

export function AppToolbar() {
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    const activeTool = useStore((s) => s.activeTool)
    const setActiveTool = useStore((s) => s.setActiveTool)
    const clearRoom = useStore((s) => s.clearRoom)
    const setShowGenerateDialog = useStore((s) => s.setShowGenerateDialog)
    const toggleSidebar = useStore((s) => s.toggleSidebar)
    const showSidebar = useStore((s) => s.showSidebar)
    const generatingCount = useStore((s) => s.generatingCount)
    const shadowsEnabled = useStore((s) => s.shadowsEnabled)
    const isPointerLocked = useStore((s) => s.isPointerLocked)
    const togglePointerLock = useStore((s) => s.togglePointerLock)
    const undo = useStore((s) => s.undo)
    const redo = useStore((s) => s.redo)
    const canUndo = useStore((s) => s.pastHistory.length > 0)
    const canRedo = useStore((s) => s.futureHistory.length > 0)
    const showLightingControls = useStore((s) => s.showLightingControls)
    const toggleLightingControls = useStore((s) => s.toggleLightingControls)
    const cinematicMode = useStore((s) => s.cinematicMode)
    const toggleCinematicMode = useStore((s) => s.toggleCinematicMode)

    const handleClearRoom = () => {
        if (window.confirm('Are you sure you want to clear all walls and items in the room?')) {
            clearRoom()
        }
    }

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5
      bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-2xl px-2.5 py-1.5 shadow-2xl shadow-indigo-100/50">

            {/* Logo */}
            <Link href="/spaces" className="flex items-center gap-2 px-2 mr-1 group/logo">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                    <Layers3 className="h-4 w-4 text-indigo-600 transition-transform group-hover/logo:scale-110" />
                </div>
                <span className="text-sm font-bold text-indigo-950 tracking-tight transition-colors uppercase italic">Decor</span>
            </Link>

            <Divider />

            <ToolButton
                icon={<MousePointer2 className="h-4 w-4" />}
                label="Select (V)"
                active={activeTool === 'select'}
                onClick={() => setActiveTool('select')}
            />
            <ToolButton
                icon={<Square className="h-4 w-4" />}
                label="Draw Walls (B)"
                active={activeTool === 'wall'}
                onClick={() => setActiveTool('wall')}
            />

            <Divider />

            <ToolButton
                icon={<Sparkles className="h-4 w-4" />}
                label="AI Generate (G)"
                badge={generatingCount}
                onClick={() => setShowGenerateDialog(true)}
            />

            <Divider />

            <ToolButton
                icon={<Undo2 className="h-4 w-4" />}
                label="Undo (Cmd+Z)"
                onClick={undo}
                disabled={!canUndo}
            />
            <ToolButton
                icon={<Redo2 className="h-4 w-4" />}
                label="Redo (Cmd+Shift+Z)"
                onClick={redo}
                disabled={!canRedo}
            />

            <Divider />

            <ToolButton
                icon={<Trash2 className="h-4 w-4" />}
                label="Clear Room"
                danger
                onClick={handleClearRoom}
            />

            <Divider />

            <ToolButton
                icon={shadowsEnabled ? <Sun className="h-4 w-4" /> : <SunDim className="h-4 w-4" />}
                label="Lighting Settings"
                active={showLightingControls}
                onClick={toggleLightingControls}
            />

            <Divider />

            <ToolButton
                icon={<Glasses className="h-4 w-4" />}
                label={isPointerLocked ? 'Unlock Cursor' : 'Cursor Lock'}
                active={isPointerLocked}
                onClick={togglePointerLock}
            />

            <Divider />

            <ToolButton
                icon={showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                label={showSidebar ? 'Hide Library' : 'Show Library'}
                onClick={toggleSidebar}
            />

            <Divider />

            <ToolButton
                icon={<Film className="h-4 w-4" />}
                label="Cinematic Mode"
                active={cinematicMode}
                onClick={toggleCinematicMode}
            />

            <Divider />

            <ToolButton
                icon={<Save className="h-4 w-4" />}
                label="Save Space (S)"
                onClick={() => setShowSaveDialog(true)}
            />

            <SaveDialog open={showSaveDialog} onOpenChange={setShowSaveDialog} />
        </div>
    )
}
