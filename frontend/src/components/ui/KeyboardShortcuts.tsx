'use client'

import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

// Keys claimed by WASD flight controls — must not trigger tool shortcuts
const MOVEMENT_KEYS = new Set(['w', 's', 'a', 'd', 'q', ' '])

export function KeyboardShortcuts() {
    const setActiveTool = useStore((s) => s.setActiveTool)
    const setShowGenerateDialog = useStore((s) => s.setShowGenerateDialog)
    const closeWallPolygon = useStore((s) => s.closeWallPolygon)
    const finishWallDrawing = useStore((s) => s.finishWallDrawing)
    const cancelWallDrawing = useStore((s) => s.cancelWallDrawing)
    const isDrawingWall = useStore((s) => s.isDrawingWall)
    const removeItem = useStore((s) => s.removeItem)
    const selectedItemId = useStore((s) => s.selectedItemId)
    const selectedWallId = useStore((s) => s.selectedWallId)
    const deleteWallSegment = useStore((s) => s.deleteWallSegment)
    const undo = useStore((s) => s.undo)
    const redo = useStore((s) => s.redo)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            const key = e.key.toLowerCase()
            if (MOVEMENT_KEYS.has(key)) { e.preventDefault(); return }

            switch (e.key) {
                case 'v': case 'V': setActiveTool('select'); break
                case 'b': case 'B': if (!isDrawingWall) setActiveTool('wall'); break
                case 'g': case 'G': setShowGenerateDialog(true); break
                case 'Escape':
                    if (isDrawingWall) cancelWallDrawing()
                    else setActiveTool('select')
                    break
                case 'Delete':
                case 'Backspace':
                    if (selectedItemId) {
                        removeItem(selectedItemId)
                    } else if (selectedWallId) {
                        const [polyId, segIdx] = selectedWallId.split('-')
                        deleteWallSegment(polyId, parseInt(segIdx, 10))
                    }
                    break
                case 'z':
                case 'Z':
                    if (e.metaKey || e.ctrlKey) {
                        e.preventDefault()
                        if (e.shiftKey) redo()
                        else undo()
                    }
                    break
                case 'y':
                case 'Y':
                    if (e.ctrlKey) {
                        e.preventDefault()
                        redo()
                    }
                    break
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [setActiveTool, setShowGenerateDialog, cancelWallDrawing, isDrawingWall, removeItem, selectedItemId, selectedWallId, deleteWallSegment, undo, redo])

    return null
}
