"use client"

import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export default function BlogPage() {
    const posts = [
        {
            title: "Hello World",
            excerpt: "The journey of a thousand spaces begins with a single manifestation. Welcome to the Decor journal.",
            date: "Feb 21, 2026",
            category: "Journal"
        }
    ]

    return (
        <div className="relative min-h-screen bg-[#fcfaff] text-[#1e1a2d] font-sans overflow-x-hidden selection:bg-indigo-100">
            {/* Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full kino-gradient" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-100/30 rounded-full blur-[100px]" />
            </div>

            {/* Nav */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-8 md:px-12 backdrop-blur-md border-b border-indigo-100/50">
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-indigo-100">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-indigo-950 uppercase italic">Decor</span>
                </Link>
                <div className="flex gap-8 text-sm font-bold uppercase tracking-wider text-indigo-400/80">
                    <Link href="/pricing" className="hover:text-indigo-950 transition-colors">Pricing</Link>
                    <Link href="/blog" className="text-indigo-950">Blog</Link>
                </div>
            </nav>

            <main className="relative z-10 px-6 py-24 md:py-32">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-20"
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-indigo-950 mb-6">
                            Insights & <span className="font-serif-italic lowercase">reflections.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-indigo-950/60 font-medium tracking-tight">
                            Thoughts on 3D design, architecture, and the future of manifestation.
                        </p>
                    </motion.div>

                    <div className="space-y-12">
                        {posts.map((post, idx) => (
                            <motion.article
                                key={post.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 + 0.2 }}
                                className="group p-10 rounded-[2.5rem] bg-white border border-indigo-50 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="text-sm font-black uppercase tracking-wider text-indigo-400">{post.category}</span>
                                    <div className="w-1 h-1 rounded-full bg-indigo-200" />
                                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400/60">{post.date}</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-indigo-950 mb-4 group-hover:text-indigo-600 transition-colors tracking-tight">
                                    {post.title}
                                </h2>
                                <p className="text-indigo-950/60 text-xl font-medium mb-8 leading-relaxed tracking-tight max-w-2xl">
                                    {post.excerpt}
                                </p>
                                <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase text-xs tracking-wider">
                                    Read Post <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </main>

            <footer className="py-24 text-center">
                <p className="text-xs font-black uppercase tracking-wider text-indigo-400">© 2026 Decor</p>
            </footer>
        </div>
    )
}
