"use client"

import { useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { AppToolbar } from '@/components/ui/Toolbar'
import { Sidebar } from '@/components/ui/Sidebar'
import { GenerateDialog } from '@/components/ui/GenerateDialog'
import { StatusBar } from '@/components/ui/StatusBar'
import { KeyboardShortcuts } from '@/components/ui/KeyboardShortcuts'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { RightPanel } from '@/components/ui/RightPanel'

const RoomCanvas = dynamic(
  () => import('@/components/3d/RoomCanvas').then((m) => ({ default: m.RoomCanvas })),
  { ssr: false }
)

export default function SpacePage() {
  const { id } = useParams()
  const isPointerLocked = useStore((s) => s.isPointerLocked)
  const cinematicMode = useStore((s) => s.cinematicMode)
  const toggleCinematicMode = useStore((s) => s.toggleCinematicMode)
  const loadSpace = useStore((s) => s.loadSpace)
  const clearRoom = useStore((s) => s.clearRoom)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && cinematicMode) {
      toggleCinematicMode()
    }
  }, [cinematicMode, toggleCinematicMode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (id && id !== 'new') {
      loadSpace(id as string)
    } else if (id === 'new') {
      clearRoom()
    }
  }, [id, loadSpace, clearRoom])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#fcfaff]">
      <RoomCanvas />

      <LoadingOverlay />

      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          {cinematicMode ? (
            <button
              onClick={toggleCinematicMode}
              className="absolute top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 backdrop-blur-xl border border-indigo-100 text-indigo-600 shadow-lg hover:bg-indigo-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : (
            <>
              <AppToolbar />
              <Sidebar />
              <RightPanel />
              <StatusBar />
            </>
          )}
          <KeyboardShortcuts />
          <GenerateDialog />
        </div>

        {isPointerLocked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="w-1.5 h-1.5 bg-white rounded-full opacity-70 mix-blend-difference" />
          </div>
        )}
      </div>
    </main>
  )
}
