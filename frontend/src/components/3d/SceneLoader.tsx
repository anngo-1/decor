import * as THREE from 'three'
import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

export function SceneLoader() {
    const setIsLoading = useStore((s) => s.setIsLoading)

    useEffect(() => {
        const manager = THREE.DefaultLoadingManager

        // We use a local tracker to avoid redundant store updates
        let isCurrentlyLoading = false

        const handleStart = () => {
            if (!isCurrentlyLoading) {
                isCurrentlyLoading = true
                // We don't call setIsLoading(true) here because loadSpace() already did.
                // This component is only responsible for the final reveal.
            }
        }

        const handleLoad = () => {
            isCurrentlyLoading = false
            setIsLoading(false)
        }

        manager.onStart = handleStart
        manager.onLoad = handleLoad

        const fallbackTimeout = setTimeout(() => {
            isCurrentlyLoading = false
            setIsLoading(false)
        }, 10000)

        return () => {
            clearTimeout(fallbackTimeout)
            manager.onStart = () => { }
            manager.onLoad = () => { }
        }
    }, [setIsLoading])

    return null
}
