"use client"

import { useEffect, useRef, useState } from "react"
import { useStore } from "@/store/useStore"
import { motion, AnimatePresence } from "framer-motion"
import { TopNav } from "@/components/ui/TopNav"
import dynamic from "next/dynamic"
import { Space } from "@/types"
import { ArrowDown, MessageSquare, Heart, Share2, Play, User, Sparkles } from "lucide-react"
import Link from "next/link"
import { LoadingOverlay } from "@/components/ui/LoadingOverlay"

const RoomCanvas = dynamic(
    () => import("@/components/3d/RoomCanvas").then((m) => ({ default: m.RoomCanvas })),
    { ssr: false }
)

function FeedItem({ space, isActive }: { space: Space; isActive: boolean }) {
    const loadSpace = useStore((s) => s.loadSpace)
    const [hasInteracted, setHasInteracted] = useState(false)

    useEffect(() => {
        if (isActive) {
            loadSpace(space.id)
        }
    }, [isActive, space.id, loadSpace])

    return (
        <div className="relative w-full h-full bg-[#fcfaff] snap-start shrink-0 overflow-hidden">
            {isActive ? (
                <div className="w-full h-full h-screen">
                    <RoomCanvas readonly />
                    <LoadingOverlay />
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-50/20">
                    {space.preview_url ? (
                        <img src={space.preview_url} alt={space.title} className="w-full h-full object-cover blur-sm opacity-50" />
                    ) : (
                        <Sparkles className="h-12 w-12 text-indigo-100 animate-pulse" />
                    )}
                </div>
            )}

            {/* Overlay Info */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 bg-gradient-to-t from-white/90 via-white/50 to-transparent pointer-events-none">
                <div className="max-w-7xl mx-auto flex justify-between items-end pointer-events-auto">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase tracking-wider text-indigo-600">@architect_{space.user_id.substring(0, 5)}</p>
                                <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-indigo-950">{space.title || "Untitled Manifesto"}</h2>
                            </div>
                        </div>
                        <p className="max-w-md text-indigo-900/60 font-medium line-clamp-2 italic">
                            {space.description || "A cinematic exploration of inner space and digital architecture."}
                        </p>

                        <div className="flex gap-4 pt-4">
                            <Link
                                href={`/space/${space.id}`}
                                className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-4 rounded-full shadow-xl shadow-indigo-200 hover:scale-105 transition-all"
                            >
                                <Play className="h-4 w-4 fill-current" />
                                Enter Studio
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 items-center">
                        <button className="flex flex-col items-center gap-1 group">
                            <div className="h-14 w-14 rounded-full bg-white/80 backdrop-blur-md border border-indigo-100 flex items-center justify-center shadow-xl group-hover:bg-indigo-600 transition-all">
                                <Heart className="h-6 w-6 text-indigo-600 group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">1.2k</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 group">
                            <div className="h-14 w-14 rounded-full bg-white/80 backdrop-blur-md border border-indigo-100 flex items-center justify-center shadow-xl group-hover:bg-indigo-600 transition-all">
                                <MessageSquare className="h-6 w-6 text-indigo-600 group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">48</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 group">
                            <div className="h-14 w-14 rounded-full bg-white/80 backdrop-blur-md border border-indigo-100 flex items-center justify-center shadow-xl group-hover:bg-indigo-600 transition-all">
                                <Share2 className="h-6 w-6 text-indigo-600 group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Share</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function FeedPage() {
    const communitySpaces = useStore((s) => s.communitySpaces)
    const fetchSpaces = useStore((s) => s.fetchSpaces)
    const [activeIndex, setActiveIndex] = useState(0)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchSpaces("community")
    }, [fetchSpaces])

    const preloadSpace = useStore(s => s.preloadSpace)

    useEffect(() => {
        if (communitySpaces.length > 0) {
            // Preload next and previous spaces for smooth scrolling
            const nextIdx = (activeIndex + 1) % communitySpaces.length
            const prevIdx = (activeIndex - 1 + communitySpaces.length) % communitySpaces.length

            preloadSpace(communitySpaces[nextIdx].id)
            preloadSpace(communitySpaces[prevIdx].id)
        }
    }, [activeIndex, communitySpaces, preloadSpace])

    const handleScroll = () => {
        if (!scrollContainerRef.current) return
        const { scrollTop, clientHeight } = scrollContainerRef.current
        const index = Math.round(scrollTop / clientHeight)
        if (index !== activeIndex) {
            setActiveIndex(index)
        }
    }

    return (
        <div className="relative h-screen flex flex-col bg-[#fcfaff] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 z-50">
                <TopNav />
            </div>

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
            >
                {communitySpaces.length > 0 ? (
                    communitySpaces.map((space, i) => (
                        <FeedItem key={space.id} space={space} isActive={i === activeIndex} />
                    ))
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-indigo-300 gap-6 animate-pulse">
                        <Sparkles className="h-12 w-12" />
                        <p className="font-bold uppercase tracking-widest text-sm">Synchronizing Spaces...</p>
                    </div>
                )}
            </div>

            {/* Scroll Indicator */}
            <AnimatePresence>
                {activeIndex === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-indigo-300 pointer-events-none"
                    >
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Swipe Down</span>
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <ArrowDown className="h-4 w-4" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
