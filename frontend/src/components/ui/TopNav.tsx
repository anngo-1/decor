"use client"

import Link from "next/link"
import { Sparkles, Plus, Play, Hammer } from "lucide-react"
import { motion } from "framer-motion"
import { usePathname } from "next/navigation"

interface TopNavProps {
    isHome?: boolean
}

export function TopNav({ isHome = false }: TopNavProps) {
    const pathname = usePathname()

    return (
        <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-md border-b border-indigo-100/50">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
            >
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-indigo-100">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-indigo-900 uppercase italic">
                        Decor
                    </span>
                </Link>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-8 md:gap-12 text-sm font-bold uppercase tracking-wider text-indigo-400/80"
            >
                {isHome ? (
                    <>
                        <Link href="/pricing" className="hover:text-indigo-900 transition-colors">Pricing</Link>
                        <Link href="/blog" className="hover:text-indigo-900 transition-colors">Blog</Link>
                    </>
                ) : (
                    <>
                        <Link
                            href="/feed"
                            className={`flex items-center gap-2 hover:text-indigo-900 transition-colors ${pathname === '/feed' ? 'text-indigo-600' : ''}`}
                        >
                            <Play className="h-4 w-4 fill-current" />
                            Spaces For You
                        </Link>
                        <Link
                            href="/spaces"
                            className={`flex items-center gap-2 hover:text-indigo-900 transition-colors ${pathname === '/spaces' ? 'text-indigo-600' : ''}`}
                        >
                            <Hammer className="h-4 w-4 fill-current" />
                            Studio
                        </Link>
                    </>
                )}
            </motion.div>
        </nav>
    )
}
