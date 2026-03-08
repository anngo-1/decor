import type { PerfSnapshot } from '@/engine/perf'

export type PerfRegressionBaseline = {
    perf: PerfSnapshot
    engine: {
        commandTotal: number
        modelTemplates: number
        modelMaterials: number
    }
    capturedAt: number
}

export type PerfRegressionThresholds = {
    maxAvgMsIncreasePct: number
    maxP95MsIncreasePct: number
    maxModelTemplateIncreasePct: number
    maxModelMaterialIncreasePct: number
}

export type PerfRegressionReport = {
    baseline: PerfRegressionBaseline
    current: PerfRegressionBaseline
    thresholds: PerfRegressionThresholds
    deltas: {
        avgMsPct: number
        p95MsPct: number
        modelTemplatesPct: number
        modelMaterialsPct: number
    }
    pass: boolean
    reasons: string[]
}

const DEFAULT_THRESHOLDS: PerfRegressionThresholds = {
    maxAvgMsIncreasePct: 15,
    maxP95MsIncreasePct: 20,
    maxModelTemplateIncreasePct: 25,
    maxModelMaterialIncreasePct: 25,
}

function pctDelta(current: number, baseline: number) {
    if (baseline <= 0) return current > 0 ? 100 : 0
    return ((current - baseline) / baseline) * 100
}

function readCurrentBaselineLike(): PerfRegressionBaseline | null {
    if (typeof window === 'undefined') return null
    const perf = window.__decorPerf
    const engine = window.__decorEngineStats
    if (!perf || !engine) return null

    return {
        perf,
        engine: {
            commandTotal: engine.commands.total,
            modelTemplates: engine.modelCache.templates,
            modelMaterials: engine.modelCache.materials,
        },
        capturedAt: Date.now(),
    }
}

export function capturePerfBaseline(label = 'default') {
    const baseline = readCurrentBaselineLike()
    if (!baseline || typeof window === 'undefined') return null
    localStorage.setItem(`decor:perf-baseline:${label}`, JSON.stringify(baseline))
    return baseline
}

export function readPerfBaseline(label = 'default') {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(`decor:perf-baseline:${label}`)
    if (!raw) return null
    try {
        return JSON.parse(raw) as PerfRegressionBaseline
    } catch {
        return null
    }
}

export function checkPerfRegression({
    label = 'default',
    thresholds = DEFAULT_THRESHOLDS,
}: {
    label?: string
    thresholds?: Partial<PerfRegressionThresholds>
} = {}): PerfRegressionReport | null {
    const baseline = readPerfBaseline(label)
    const current = readCurrentBaselineLike()
    if (!baseline || !current) return null

    const mergedThresholds: PerfRegressionThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
    const deltas = {
        avgMsPct: pctDelta(current.perf.avgMs, baseline.perf.avgMs),
        p95MsPct: pctDelta(current.perf.p95Ms, baseline.perf.p95Ms),
        modelTemplatesPct: pctDelta(current.engine.modelTemplates, baseline.engine.modelTemplates),
        modelMaterialsPct: pctDelta(current.engine.modelMaterials, baseline.engine.modelMaterials),
    }

    const reasons: string[] = []
    if (deltas.avgMsPct > mergedThresholds.maxAvgMsIncreasePct) {
        reasons.push(`avgMs +${deltas.avgMsPct.toFixed(1)}% > ${mergedThresholds.maxAvgMsIncreasePct}%`)
    }
    if (deltas.p95MsPct > mergedThresholds.maxP95MsIncreasePct) {
        reasons.push(`p95Ms +${deltas.p95MsPct.toFixed(1)}% > ${mergedThresholds.maxP95MsIncreasePct}%`)
    }
    if (deltas.modelTemplatesPct > mergedThresholds.maxModelTemplateIncreasePct) {
        reasons.push(`modelTemplates +${deltas.modelTemplatesPct.toFixed(1)}% > ${mergedThresholds.maxModelTemplateIncreasePct}%`)
    }
    if (deltas.modelMaterialsPct > mergedThresholds.maxModelMaterialIncreasePct) {
        reasons.push(`modelMaterials +${deltas.modelMaterialsPct.toFixed(1)}% > ${mergedThresholds.maxModelMaterialIncreasePct}%`)
    }

    return {
        baseline,
        current,
        thresholds: mergedThresholds,
        deltas,
        pass: reasons.length === 0,
        reasons,
    }
}
