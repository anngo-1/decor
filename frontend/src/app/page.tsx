"use client"

import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { motion, Variants } from "framer-motion"
import { TopNav } from "@/components/ui/TopNav"
import { Play, Hammer } from "lucide-react"

export default function LandingPage() {
  const setUserId = useStore((s) => s.setUserId)
  const communitySpaces = useStore((s) => s.communitySpaces)
  const fetchSpaces = useStore((s) => s.fetchSpaces)

  useEffect(() => {
    let hash = localStorage.getItem("decor_guest_hash")
    if (!hash) {
      hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      localStorage.setItem("decor_guest_hash", hash)
    }
    setUserId(hash)

    const apiBase = '/api/backend'
    fetch(`${apiBase}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: hash })
    }).catch(err => console.error("Silent registration failed:", err))

    // Fetch real community spaces via store
    fetchSpaces('community')
  }, [setUserId, fetchSpaces])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: "easeOut" }
    }
  }

  return (
    <div className="relative min-h-screen bg-[#fcfaff] text-[#1e1a2d] overflow-x-hidden font-sans selection:bg-indigo-100 italic-none">
      {/* Subtle Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full kino-gradient" />

        {/* Perspective Grid Layer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0 z-0 perspective-grid origin-bottom"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 3 }}
          className="absolute top-[-5%] right-[-5%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-[120px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 3, delay: 0.5 }}
          className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/20 rounded-full blur-[100px]"
        />
      </div>

      <TopNav isHome />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center min-h-[85vh] px-6 text-center pt-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center rounded-full border border-indigo-100 bg-white px-5 py-2 text-xs font-black uppercase tracking-wider text-indigo-400 mb-10 shadow-sm"
            >
              The 3D Shopping Experience
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="max-w-5xl text-6xl font-bold tracking-tight sm:text-8xl md:text-9xl leading-[0.85] text-indigo-950 mb-10"
            >
              Manifest your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-950 to-indigo-400 font-serif-italic lowercase tracking-tight">
                inner space.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="max-w-xl text-lg md:text-xl text-indigo-900/60 font-medium leading-relaxed mb-14 tracking-tight"
            >
              Model your space in 3D and try furniture before you buy.
              The most cinematic way to architect your personal sanctuary.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-5">
              <Link
                href="/spaces"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-12 py-5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:scale-105 transition-all duration-500 shadow-xl shadow-indigo-200"
              >
                <span className="relative flex items-center gap-3 text-lg">
                  <Hammer className="h-5 w-5 fill-current" />
                  Studio
                </span>
              </Link>
              <Link
                href="/feed"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-12 py-5 font-bold text-indigo-600 border-2 border-indigo-100 bg-white/50 backdrop-blur-sm hover:border-indigo-600 hover:scale-105 transition-all duration-500 shadow-lg shadow-indigo-50/50"
              >
                <span className="relative flex items-center gap-3 text-lg">
                  <Play className="h-5 w-5 fill-current" />
                  Spaces For You
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Community Data Fetch */}
        <section className="py-32 px-6 md:px-12 border-t border-indigo-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-20">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-4">Latest manifestos</h2>
                <p className="text-4xl md:text-6xl font-bold tracking-tight text-indigo-950">Community Showcase.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {communitySpaces.length > 0 ? (
                communitySpaces.map((space) => (
                  <Link
                    key={space.id}
                    href={`/space/${space.id}`}
                  >
                    <motion.div
                      whileHover={{ y: -8 }}
                      className="aspect-[4/5] rounded-3xl bg-white border border-indigo-50 shadow-sm overflow-hidden relative group cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-indigo-50/30 flex items-center justify-center">
                        {space.preview_url ? (
                          <img src={space.preview_url} alt={space.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-indigo-200 font-black text-2xl uppercase italic">{space.title || "Untitled"}</span>
                        )}
                      </div>
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="p-4 rounded-2xl glass shadow-xl">
                          <p className="text-sm font-bold text-indigo-900 mb-1">{space.title || "Design Space"}</p>
                          <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider italic">3D Perspective</p>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))
              ) : (
                // Fallback / Skeleton
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[4/5] rounded-3xl bg-indigo-50/20 border border-indigo-50 animate-pulse" />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Studio Messaging */}
        <section className="py-40 px-6 md:px-12 bg-white/50 backdrop-blur-sm border-y border-indigo-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-12 text-indigo-950">Try it in your world.</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-left mt-24">
              <div>
                <h3 className="text-lg font-bold mb-4 italic text-indigo-900">01. Model</h3>
                <p className="text-indigo-900/60 font-light leading-relaxed">
                  Design precise floor plans and wall structures for any room in your residence.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-4 italic text-indigo-900">02. Curate</h3>
                <p className="text-indigo-900/60 font-light leading-relaxed">
                  Place items from thousands of furniture brands to see how they fit your unique layout.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-4 italic text-indigo-900">03. Acquire</h3>
                <p className="text-indigo-900/60 font-light leading-relaxed">
                  Purchase the items directly from the 3D studio once you've perfected your vision.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modern Decor Footer */}
      <footer className="py-32 px-6 md:px-12 text-center bg-[#fcfaff]">
        <div className="max-w-4xl mx-auto">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-indigo-100 mx-auto mb-10">
            <Sparkles className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="text-4xl font-bold mb-10 tracking-tighter text-indigo-950">Manifest yours.</h2>
          <p className="text-xs font-black uppercase tracking-wider text-indigo-400/80 mb-16">
            Join the elite circle of digital architects.
          </p>
          <div className="flex justify-center gap-12 text-xs font-black uppercase tracking-wider text-indigo-400">
            <a href="#" className="hover:text-indigo-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-900 transition-colors">Decor</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
