import type { PerfSnapshot } from '@/engine/perf'

export type QualityTier = 'high' | 'medium' | 'low'

type QualityDecisionInput = {
    snapshot: PerfSnapshot
    qualityTier: QualityTier
    isLowPerfDevice: boolean
    minSwitchIntervalMs: number
    nowMs: number
    lastSwitchAtMs: number
}

export function decideNextQualityTier({
    snapshot,
    qualityTier,
    isLowPerfDevice,
    minSwitchIntervalMs,
    nowMs,
    lastSwitchAtMs,
}: QualityDecisionInput): QualityTier {
    if (snapshot.frames < 60) return qualityTier
    if (nowMs - lastSwitchAtMs < minSwitchIntervalMs) return qualityTier

    const underPressure = snapshot.p95Ms > 24 || snapshot.avgMs > 18
    const healthy = snapshot.p95Ms < 15 && snapshot.avgMs < 12

    if (underPressure) {
        if (qualityTier === 'high') return 'medium'
        if (qualityTier === 'medium') return 'low'
        return 'low'
    }

    if (!healthy) return qualityTier
    if (qualityTier === 'low') return isLowPerfDevice ? 'medium' : 'high'
    if (qualityTier === 'medium' && !isLowPerfDevice) return 'high'
    return qualityTier
}
