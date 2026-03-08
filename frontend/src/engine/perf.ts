export type PerfSnapshot = {
    frames: number
    avgMs: number
    p95Ms: number
    maxMs: number
    fps: number
}

declare global {
    interface Window {
        __decorPerf?: PerfSnapshot
        __DECOR_BENCHMARK?: boolean
        __DECOR_AUTO_SCALE?: boolean
    }
}

class PerfCollector {
    private samples: number[] = []
    private readonly maxSamples = 300
    private readonly reportIntervalMs = 5000
    private lastReportAt = 0
    private enabled = false

    setEnabled(enabled: boolean) {
        this.enabled = enabled
    }

    pushFrame(frameMs: number) {
        if (!this.enabled) return
        this.samples.push(frameMs)
        if (this.samples.length > this.maxSamples) this.samples.shift()
        const now = performance.now()
        if (now - this.lastReportAt >= this.reportIntervalMs) {
            this.lastReportAt = now
            const snapshot = this.getSnapshot()
            if (!snapshot) return
            window.__decorPerf = snapshot
            if (process.env.NODE_ENV !== 'production') {
                console.info(
                    `[engine-perf] avg=${snapshot.avgMs.toFixed(2)}ms p95=${snapshot.p95Ms.toFixed(2)}ms max=${snapshot.maxMs.toFixed(2)}ms fps=${snapshot.fps.toFixed(1)}`,
                )
            }
        }
    }

    getSnapshot(): PerfSnapshot | null {
        if (this.samples.length === 0) return null
        const sorted = [...this.samples].sort((a, b) => a - b)
        const total = this.samples.reduce((sum, v) => sum + v, 0)
        const avgMs = total / this.samples.length
        const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
        const p95Ms = sorted[p95Index]
        const maxMs = sorted[sorted.length - 1]
        return {
            frames: this.samples.length,
            avgMs,
            p95Ms,
            maxMs,
            fps: 1000 / Math.max(avgMs, 0.0001),
        }
    }
}

export const enginePerf = new PerfCollector()
