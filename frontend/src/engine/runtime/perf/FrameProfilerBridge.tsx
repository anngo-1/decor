'use client'

import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { enginePerf } from '@/engine/perf'

export function FrameProfilerBridge() {
    useEffect(() => {
        const enabled = process.env.NEXT_PUBLIC_ENGINE_BENCHMARK === '1' || window.__DECOR_BENCHMARK === true || (window.__DECOR_AUTO_SCALE ?? true)
        enginePerf.setEnabled(enabled)
        return () => enginePerf.setEnabled(false)
    }, [])

    useFrame((_, delta) => {
        enginePerf.pushFrame(Math.min(delta * 1000, 50))
    })

    return null
}
