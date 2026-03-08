'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useStore } from '@/store/useStore'

export function ScreenshotBridge() {
    const { gl, scene, camera } = useThree()
    const setGetScreenshot = useStore((s) => s.setGetScreenshot)

    useEffect(() => {
        const getScreenshot = () => {
            gl.render(scene, camera)
            return gl.domElement.toDataURL('image/jpeg', 0.8)
        }

        setGetScreenshot(getScreenshot)
        return () => setGetScreenshot(null)
    }, [gl, scene, camera, setGetScreenshot])

    return null
}
