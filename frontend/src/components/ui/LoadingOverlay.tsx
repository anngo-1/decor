'use client'

import { useStore } from '@/store/useStore'
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function LoadingOverlay() {
    const isLoading = useStore((s) => s.isLoading)

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#fcfaff]/90 backdrop-blur-xl pointer-events-auto"
                >
                    <div className="relative flex flex-col items-center">
                        {/* CSS-only rings */}
                        <div className="absolute inset-0 -m-8 rounded-full border border-indigo-100/50 animate-[spin_3s_linear_infinite]" />
                        <div className="absolute inset-0 -m-12 rounded-full border border-indigo-200/20 animate-[spin_6s_linear_reverse_infinite]" />

                        <div className="mb-6 h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                        </div>

                        <h2 className="text-xl font-bold tracking-tight text-indigo-950 mb-1">Preparing Room</h2>
                        <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest opacity-70">Finalizing 3D assets</p>

                        <div className="mt-8 flex items-center gap-1.5 overflow-hidden w-24 opacity-50">
                            <motion.div
                                initial={{ x: -100 }}
                                animate={{ x: 100 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                className="h-[2px] w-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
