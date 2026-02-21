"use client"

import Link from "next/link"
import { Sparkles, Check } from "lucide-react"
import { motion } from "framer-motion"

export default function PricingPage() {
    const tiers = [
        {
            name: "Free",
            price: "$0",
            description: "Perfect for exploring your creative potential.",
            features: [
                "1 Active Space",
                "Basic 3D Asset Library",
                "Community Support",
                "Standard Export"
            ],
            buttonText: "Get Started",
            highlight: false
        },
        {
            name: "Pro",
            price: "$20",
            description: "For serious architects of digital sanctuary.",
            features: [
                "Unlimited Active Spaces",
                "Full 3D Asset Library",
                "HD Cinema Renders",
                "Priority Support",
                "AI Space Generation"
            ],
            buttonText: "Upgrade to Pro",
            highlight: true
        }
    ]

    return (
        <div className="relative min-h-screen bg-[#fcfaff] text-[#1e1a2d] font-sans overflow-x-hidden selection:bg-indigo-100">
            {/* Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full kino-gradient" />
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-100/40 rounded-full blur-[100px]" />
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
                    <Link href="/pricing" className="text-indigo-950">Pricing</Link>
                    <Link href="/blog" className="hover:text-indigo-900 transition-colors">Blog</Link>
                </div>
            </nav>

            <main className="relative z-10 px-6 py-24 md:py-32">
                <div className="max-w-5xl mx-auto text-center mb-20">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight text-indigo-950 mb-6"
                    >
                        Simple <span className="font-serif-italic lowercase">pricing.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg md:text-xl text-indigo-950/60 max-w-xl mx-auto font-medium tracking-tight"
                    >
                        Choose the tier that fits your manifestion. No hidden fees, just pure creativity.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {tiers.map((tier, idx) => (
                        <motion.div
                            key={tier.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 + 0.2 }}
                            className={`flex flex-col p-10 rounded-[2.5rem] border ${tier.highlight
                                ? "bg-white border-indigo-200 shadow-2xl shadow-indigo-100 ring-1 ring-indigo-500/20"
                                : "bg-white/50 border-indigo-100 backdrop-blur-sm"
                                }`}
                        >
                            <h2 className="text-base font-black uppercase tracking-wider text-indigo-400 mb-2">{tier.name}</h2>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-5xl font-bold text-indigo-950">{tier.price}</span>
                                <span className="text-indigo-400 font-medium">/month</span>
                            </div>
                            <p className="text-indigo-950/60 text-base font-medium mb-10 leading-relaxed tracking-tight">
                                {tier.description}
                            </p>

                            <ul className="space-y-4 mb-12">
                                {tier.features.map(feature => (
                                    <li key={feature} className="flex items-center gap-3 text-base font-bold text-indigo-950/80">
                                        <Check className="h-4 w-4 text-indigo-500" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button className={`w-full py-4 rounded-full font-bold transition-all mt-auto ${tier.highlight
                                ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02]"
                                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                }`}>
                                {tier.buttonText}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </main>

            <footer className="py-24 text-center">
                <p className="text-xs font-black uppercase tracking-wider text-indigo-400">© 2026 Decor</p>
            </footer>
        </div>
    )
}
