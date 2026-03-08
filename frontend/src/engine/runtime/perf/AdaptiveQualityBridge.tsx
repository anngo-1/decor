'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { enginePerf } from '@/engine/perf'
import { decideNextQualityTier, type QualityTier } from '@/engine/runtime/quality'

export function AdaptiveQualityBridge({
    readonly,
    isLowPerfDevice,
    qualityTier,
    setQualityTier,
}: {
    readonly: boolean
    isLowPerfDevice: boolean
    qualityTier: QualityTier
    setQualityTier: (tier: QualityTier) => void
}) {
    const frameCounter = useRef(0)
    const lastSwitchAtRef = useRef(0)

    useFrame(() => {
        if (readonly) return
        const autoScaleEnabled = window.__DECOR_AUTO_SCALE ?? true
        if (!autoScaleEnabled) return
        frameCounter.current += 1
        if (frameCounter.current < 30) return
        frameCounter.current = 0

        const snapshot = enginePerf.getSnapshot()
        if (!snapshot) return
        const now = performance.now()
        const nextQualityTier = decideNextQualityTier({
            snapshot,
            qualityTier,
            isLowPerfDevice,
            minSwitchIntervalMs: 2000,
            nowMs: now,
            lastSwitchAtMs: lastSwitchAtRef.current,
        })

        if (nextQualityTier !== qualityTier) {
            setQualityTier(nextQualityTier)
            lastSwitchAtRef.current = now
        }
    })

    return null
}
