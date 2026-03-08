'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useStore } from '@/store/useStore'
import { shouldInvalidateScene } from '@/engine/runtime/renderInvalidation'

export function StoreInvalidatorBridge() {
    const invalidate = useThree((s) => s.invalidate)

    useEffect(() => {
        let prev = useStore.getState() as unknown as Record<string, unknown>
        return useStore.subscribe((state) => {
            const next = state as unknown as Record<string, unknown>
            if (shouldInvalidateScene(prev, next)) {
                prev = next
                invalidate()
                return
            }
            prev = next
        })
    }, [invalidate])

    return null
}
