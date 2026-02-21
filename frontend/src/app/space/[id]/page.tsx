"use client"

import dynamic from 'next/dynamic'
import { useStore } from '@/store/useStore'
import { AppToolbar } from '@/components/ui/Toolbar'
import { Sidebar } from '@/components/ui/Sidebar'
import { GenerateDialog } from '@/components/ui/GenerateDialog'
import { ItemPopover } from '@/components/ui/ItemPopover'
import { WallPopover } from '@/components/ui/WallPopover'
import { StatusBar } from '@/components/ui/StatusBar'
import { KeyboardShortcuts } from '@/components/ui/KeyboardShortcuts'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'

// Dynamically import the Canvas to avoid SSR issues
const RoomCanvas = dynamic(
  () => import('@/components/3d/RoomCanvas').then((m) => ({ default: m.RoomCanvas })),
  { ssr: false }
)

import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function Home() {
  const { id } = useParams()
  const isPointerLocked = useStore((s) => s.isPointerLocked)
  const loadSpace = useStore((s) => s.loadSpace)
  const clearRoom = useStore((s) => s.clearRoom)

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
          <AppToolbar />
          <Sidebar />
          <ItemPopover />
          <WallPopover />
          <StatusBar />
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
