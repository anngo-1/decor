'use client'

import { useStore } from '@/store/useStore'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { Settings } from 'lucide-react'
import { RoomSettingsSection } from './right-panel/RoomSettingsSection'
import { ItemSettingsSection } from './right-panel/ItemSettingsSection'
import { WallSettingsSection } from './right-panel/WallSettingsSection'
import { LightSettingsSection } from './right-panel/LightSettingsSection'

export function RightPanel() {
    const selection = useStore((s) => s.selection)

    return (
        <aside
            className="absolute right-0 top-0 bottom-0 w-64 bg-white border-l border-indigo-100 flex flex-col overflow-hidden z-40"
        >
            {/* Header */}
            <div className="h-11 border-b border-indigo-100 flex items-center px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-bold text-xs text-indigo-400 uppercase tracking-widest">
                        Properties
                    </span>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <ScrollArea.Root className="flex-1 overflow-hidden">
                <ScrollArea.Viewport className="h-full w-full">
                    <div className="p-4 flex flex-col gap-5">
                        {selection?.type === 'item' && <ItemSettingsSection itemId={selection.id} />}
                        {selection?.type === 'wall' && <WallSettingsSection wallId={selection.id} />}
                        {selection?.type === 'light' && <LightSettingsSection lightId={selection.id} />}

                        {/* Divider between selection properties and global environment properties */}
                        {selection !== null && <div className="h-px bg-indigo-100/50" />}

                        <RoomSettingsSection />
                    </div>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar orientation="vertical" className="flex w-1 touch-none select-none p-0.5">
                    <ScrollArea.Thumb className="relative flex-1 rounded-full bg-indigo-100 hover:bg-indigo-200 transition-colors" />
                </ScrollArea.Scrollbar>
            </ScrollArea.Root>
        </aside>
    )
}
