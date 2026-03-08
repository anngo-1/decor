'use client'

import { useEffect } from 'react'
import { capturePerfBaseline, checkPerfRegression } from '@/engine/runtime/perf/regression'

declare global {
    interface Window {
        __captureDecorPerfBaseline?: (label?: string) => ReturnType<typeof capturePerfBaseline>
        __checkDecorPerfRegression?: (label?: string) => ReturnType<typeof checkPerfRegression>
    }
}

export function PerfRegressionBridge() {
    useEffect(() => {
        window.__captureDecorPerfBaseline = (label = 'default') => capturePerfBaseline(label)
        window.__checkDecorPerfRegression = (label = 'default') => checkPerfRegression({ label })

        return () => {
            delete window.__captureDecorPerfBaseline
            delete window.__checkDecorPerfRegression
        }
    }, [])

    return null
}
