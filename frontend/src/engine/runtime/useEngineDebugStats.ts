import { useEffect } from 'react'
import { getEngineCommandStats } from '@/engine/core/commands'
import { getModelCacheStats } from '@/engine/assets/modelCache'

export type EngineDebugStats = {
    commands: ReturnType<typeof getEngineCommandStats>
    modelCache: ReturnType<typeof getModelCacheStats>
    updatedAt: number
}

declare global {
    interface Window {
        __decorEngineStats?: EngineDebugStats
    }
}

function writeDebugStats() {
    window.__decorEngineStats = {
        commands: getEngineCommandStats(),
        modelCache: getModelCacheStats(),
        updatedAt: Date.now(),
    }
}

export function EngineDebugStatsBridge() {
    useEffect(() => {
        writeDebugStats()
        const timer = window.setInterval(writeDebugStats, 2000)
        return () => window.clearInterval(timer)
    }, [])

    return null
}
