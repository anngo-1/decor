'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Save, Globe, Lock, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'

interface SaveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SaveDialog({ open, onOpenChange }: SaveDialogProps) {
    const editingSpaceId = useStore((s) => s.editingSpaceId)
    const userSpaces = useStore((s) => s.userSpaces)
    const currentSpace = userSpaces.find(s => s.id === editingSpaceId)

    const [title, setTitle] = useState(currentSpace?.title || 'My Beautiful Space')
    const [description, setDescription] = useState(currentSpace?.description || '')
    const [isPublished, setIsPublished] = useState(currentSpace?.is_published || false)

    const saveSpace = useStore((s) => s.saveSpace)
    const isSaving = useStore((s) => s.isSaving)

    const handleSave = async () => {
        const id = await saveSpace(title, description, isPublished)
        if (id) {
            onOpenChange(false)
        }
    }

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-indigo-950/30 backdrop-blur-sm animate-fade-in" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-3xl bg-white border border-indigo-100 p-8 shadow-2xl shadow-indigo-100 focus:outline-none">
                    <div className="flex items-center justify-between mb-8">
                        <Dialog.Title className="text-2xl font-bold tracking-tight text-indigo-950 flex items-center gap-2">
                            <Save className="h-6 w-6 text-indigo-500" />
                            Save Space
                        </Dialog.Title>
                        <Dialog.Close className="rounded-full p-2 text-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                            <X className="h-5 w-5" />
                        </Dialog.Close>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-indigo-400 ml-1">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a name for your space..."
                                className="w-full h-12 rounded-2xl border border-indigo-100 bg-indigo-50/30 px-4 text-indigo-950 focus:border-indigo-400 focus:bg-white focus:outline-none transition-all placeholder:text-indigo-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-indigo-400 ml-1">Description <span className="normal-case font-medium">(optional)</span></label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What's the vibe of this room?"
                                rows={3}
                                className="w-full rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 text-indigo-950 focus:border-indigo-400 focus:bg-white focus:outline-none transition-all placeholder:text-indigo-300 resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${isPublished ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-50 text-indigo-300'}`}>
                                    {isPublished ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-indigo-950">Publish to Community</p>
                                    <p className="text-xs text-indigo-400">Appear in the gallery & home page</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPublished(!isPublished)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isPublished ? 'bg-indigo-500' : 'bg-indigo-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving || !title.trim()}
                            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 group mt-2"
                        >
                            {isSaving ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    Save Space
                                    <Save className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
