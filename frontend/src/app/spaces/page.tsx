"use client"

import { useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Plus, Clock, Users, ArrowRight, Globe } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Space } from '@/types'
import { motion } from 'framer-motion'
import { TopNav } from '@/components/ui/TopNav'

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function SpaceCard({ space }: { space: Space }) {
    return (
        <Link href={`/space/${space.id}`} className="group block rounded-3xl border border-indigo-100 bg-white shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all overflow-hidden hover:-translate-y-1">
            <div className="aspect-video relative bg-indigo-50/30 overflow-hidden">
                {space.preview_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={space.preview_url} alt={space.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-200">
                        <Sparkles className="h-10 w-10" />
                    </div>
                )}
                {space.is_published && (
                    <div className="absolute top-3 right-3 bg-indigo-600 rounded-full p-1.5">
                        <Globe className="h-3 w-3 text-white" />
                    </div>
                )}
            </div>
            <div className="p-5">
                <h3 className="font-bold text-indigo-950 tracking-tight truncate">{space.title}</h3>
                {space.description && <p className="text-sm text-indigo-400 mt-1 truncate">{space.description}</p>}
                <p className="text-xs text-indigo-300 mt-3 font-medium">
                    {space.updated_at ? `Edited ${formatDate(space.updated_at)}` : `Created ${formatDate(space.created_at)}`}
                </p>
            </div>
        </Link>
    )
}

function CommunityCard({ space }: { space: Space }) {
    return (
        <Link href={`/space/${space.id}`} className="group block rounded-3xl border border-indigo-100 bg-white shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all overflow-hidden hover:-translate-y-1">
            <div className="aspect-video relative bg-indigo-50/30 overflow-hidden">
                {space.preview_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={space.preview_url} alt={space.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-200">
                        <Sparkles className="h-10 w-10" />
                    </div>
                )}
            </div>
            <div className="p-5">
                <h3 className="font-bold text-indigo-950 tracking-tight truncate">{space.title}</h3>
                <p className="text-xs text-indigo-400 mt-1 font-medium">
                    By {space.user_id.substring(0, 8)}…
                </p>
            </div>
        </Link>
    )
}

export default function SpacesPage() {
    const userId = useStore(s => s.userId)
    const userSpaces = useStore(s => s.userSpaces)
    const communitySpaces = useStore(s => s.communitySpaces)
    const fetchSpaces = useStore(s => s.fetchSpaces)
    const setUserId = useStore(s => s.setUserId)

    useEffect(() => {
        if (!userId) {
            const hash = localStorage.getItem("decor_guest_hash")
            if (hash) setUserId(hash)
        }
    }, [userId, setUserId])

    useEffect(() => {
        if (userId) {
            fetchSpaces('user')
            fetchSpaces('community')
        }
    }, [userId, fetchSpaces])

    const sortedUserSpaces = [...userSpaces].sort(
        (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    )

    return (
        <div className="relative min-h-screen bg-[#fcfaff] text-[#1e1a2d] font-sans overflow-x-hidden selection:bg-indigo-100">
            {/* Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] bg-indigo-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-purple-100/30 rounded-full blur-[100px]" />
            </div>

            {/* Nav */}
            <TopNav />

            <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-20">

                {/* My Spaces */}
                <section>
                    <div className="flex items-end justify-between mb-10">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-indigo-500 mb-2 flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Your Spaces
                            </p>
                            <h1 className="text-4xl font-bold tracking-tight text-indigo-950">Your <span className="font-serif-italic">studio.</span></h1>
                        </div>
                        <Link href="/space/new" className="hidden sm:flex items-center gap-2 bg-indigo-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all text-sm">
                            <Plus className="h-4 w-4" />
                            New Space
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* New Space Card */}
                        <Link href="/space/new" className="sm:hidden group flex items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-indigo-200 bg-white/50 p-10 text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                            <Plus className="h-6 w-6" />
                            <span className="font-bold">New Space</span>
                        </Link>

                        {sortedUserSpaces.map((space: Space) => (
                            <motion.div key={space.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                                <SpaceCard space={space} />
                            </motion.div>
                        ))}

                        {sortedUserSpaces.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-indigo-200 rounded-3xl text-indigo-300">
                                <Sparkles className="h-10 w-10 mb-4" />
                                <p className="font-bold text-indigo-400">No spaces yet.</p>
                                <p className="text-sm mt-1">Create your first one above.</p>
                            </div>
                        )}
                    </div>
                </section>

                <div className="border-t border-indigo-100" />

                {/* Community */}
                <section>
                    <div className="flex items-end justify-between mb-10">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-indigo-500 mb-2 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Community
                            </p>
                            <h2 className="text-4xl font-bold tracking-tight text-indigo-950">Inspiration <span className="font-serif-italic">gallery.</span></h2>
                        </div>
                        <Link href="/" className="hidden sm:flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-600 transition-colors">
                            View all <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {communitySpaces.map((space: Space) => (
                            <motion.div key={space.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                                <CommunityCard space={space} />
                            </motion.div>
                        ))}

                        {communitySpaces.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-indigo-200 rounded-3xl text-indigo-300">
                                <Users className="h-10 w-10 mb-4" />
                                <p className="font-bold text-indigo-400">Community gallery is empty.</p>
                                <p className="text-sm mt-1">Publish a space to be the first!</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
