'use client'

import { useState, useCallback, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Sparkles, X, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { useStore } from '@/store/useStore'

function useGenerationPolling() {
    const updateGenerationTask = useStore((s) => s.updateGenerationTask)
    const placeItem = useStore((s) => s.placeItem)

    const pollTask = useCallback(async (taskId: string, name: string) => {
        const maxAttempts = 60 // 2 mins at 2s interval
        let attempts = 0

        const poll = async () => {
            if (attempts >= maxAttempts) {
                updateGenerationTask(taskId, { status: 'failed' })
                return
            }
            attempts++

            try {
                const res = await fetch(`/api/generate/${taskId}`)
                const data = await res.json()

                if (data.status === 'success' || data.status === 'completed') {
                    updateGenerationTask(taskId, {
                        status: 'completed',
                        modelUrl: data.modelUrl,
                        progress: 100,
                    })
                    // Auto-place the generated model
                    placeItem({
                        name,
                        modelUrl: data.modelUrl,
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: 1,
                        isGenerated: true,
                        generationTaskId: taskId,
                    })
                } else if (data.status === 'failed') {
                    updateGenerationTask(taskId, { status: 'failed' })
                } else {
                    updateGenerationTask(taskId, {
                        status: 'processing',
                        progress: data.progress ?? attempts * 2,
                    })
                    setTimeout(poll, 2000)
                }
            } catch (e) {
                console.error('Polling error:', e)
                setTimeout(poll, 3000)
            }
        }

        poll()
    }, [updateGenerationTask, placeItem])

    return { pollTask }
}

export function GenerateDialog() {
    const showGenerateDialog = useStore((s) => s.showGenerateDialog)
    const setShowGenerateDialog = useStore((s) => s.setShowGenerateDialog)
    const addGenerationTask = useStore((s) => s.addGenerationTask)
    const placeItem = useStore((s) => s.placeItem)

    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { pollTask } = useGenerationPolling()

    const handleFile = (f: File) => {
        if (!f.type.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG, WebP)')
            return
        }
        setFile(f)
        setError(null)
        const url = URL.createObjectURL(f)
        setPreview(url)
        if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped) handleFile(dropped)
    }

    const handleSubmit = async () => {
        if (!file) return
        setIsSubmitting(true)
        setError(null)

        try {
            const fd = new FormData()
            fd.append('file', file)

            const res = await fetch('/api/generate', { method: 'POST', body: fd })
            const data = await res.json()

            if (!res.ok || !data.taskId) {
                setError(data.error || 'Failed to start generation')
                return
            }

            const modelName = name || 'AI Model'

            if (data.status === 'completed' && data.modelUrl) {
                addGenerationTask({ taskId: data.taskId, status: 'completed', name: modelName })
                placeItem({
                    name: modelName,
                    modelUrl: data.modelUrl,
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    scale: 1,
                    isGenerated: true,
                    generationTaskId: data.taskId,
                })
            } else {
                addGenerationTask({ taskId: data.taskId, status: 'queued', name: modelName })
                pollTask(data.taskId, modelName)
            }
            setShowGenerateDialog(false)
            setFile(null)
            setPreview(null)
            setName('')
        } catch {
            setError('Network error, please try again')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setShowGenerateDialog(false)
        setError(null)
    }

    return (
        <Dialog.Root open={showGenerateDialog} onOpenChange={handleClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] outline-none"
                >
                    <div className="bg-white/98 backdrop-blur-xl border border-indigo-200 rounded-2xl shadow-2xl shadow-indigo-200/50 animate-dialog-in overflow-hidden w-full">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                                    <Sparkles className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <Dialog.Title className="text-sm font-bold text-indigo-950">
                                        Generate 3D from Image
                                    </Dialog.Title>
                                    <p className="text-[11px] font-bold text-indigo-600/70 mt-0.5">
                                        Powered by Hunyuan3D · ~20-40 seconds
                                    </p>
                                </div>
                            </div>
                            <Dialog.Close className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-700 transition-colors">
                                <X className="h-4 w-4" />
                            </Dialog.Close>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative flex flex-col items-center justify-center h-44 rounded-2xl border-2 border-dashed
                    transition-all duration-300 cursor-pointer overflow-hidden
                    ${isDragging ? 'border-indigo-500 bg-indigo-100/40' : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/60'}
                  `}
                            >
                                {preview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="absolute inset-0 w-full h-full object-cover opacity-90"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-indigo-400">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-indigo-200 shadow-sm">
                                            <ImageIcon className="h-6 w-6 text-indigo-500" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-indigo-900/80 uppercase tracking-tight">Drop an image here</p>
                                            <p className="text-[11px] font-bold text-indigo-600/60 mt-1">or click to browse · JPG, PNG, WebP</p>
                                        </div>
                                    </div>
                                )}
                                {preview && (
                                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md rounded-xl px-3 py-1.5 text-[11px] font-black text-indigo-700 border border-indigo-200 shadow-xl">
                                        CLICK TO CHANGE
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-[11px] font-black uppercase tracking-wider text-indigo-500 mb-2 block">Model Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Eames Chair"
                                    className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm text-indigo-950
                      placeholder:text-indigo-300 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                    <p className="text-xs font-bold text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={!file || isSubmitting}
                                className="w-full flex items-center justify-center gap-3 py-4 rounded-full
                    bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-50 disabled:text-indigo-300
                    text-white text-sm font-black uppercase tracking-widest transition-all duration-500
                    disabled:cursor-not-allowed shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-95"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Starting generation...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 fill-current" />
                                        Generate 3D Model
                                    </>
                                )}
                            </button>

                            <div className="pt-2 border-t border-indigo-50">
                                <p className="text-center text-[10px] font-bold text-indigo-400 italic tracking-tight uppercase">
                                    Best results: single object on plain background, good lighting
                                </p>
                                <p className="text-center text-[9px] font-black text-indigo-300 uppercase tracking-[0.05em] mt-2">
                                    Background Task · You can safely exit and continue designing
                                </p>
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
