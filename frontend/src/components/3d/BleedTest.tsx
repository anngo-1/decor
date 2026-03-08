'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

export function BleedTest() {
    const { gl, scene } = useThree()
    const roomPolygons = useStore((s) => s.roomPolygons)

    useEffect(() => {
        const polys = roomPolygons.filter((p) => p.points.length >= 2)
        console.log(`[BleedTest] mounted — ${polys.length} polygon(s), closed: ${polys.filter(p => p.closed).length}`)

        if (polys.length === 0) {
            console.log('[BleedTest] no walls — draw some walls first')
            return
        }

        const timer = setTimeout(() => {
            console.log('[BleedTest] running scan...')

            const allPts = polys.flatMap((p) => p.points)
            const cx = allPts.reduce((s, p) => s + p.x, 0) / allPts.length
            const cz = allPts.reduce((s, p) => s + p.z, 0) / allPts.length

            const SIZE = 128
            const testCam = new THREE.PerspectiveCamera(50, 1, 0.5, 100)
            const rt = new THREE.WebGLRenderTarget(SIZE, SIZE)
            const buf = new Uint8Array(SIZE * SIZE * 4)
            const bleedResults: string[] = []

            const heights = [0.15, 0.3, 0.6, 1.0]
            const distances = [2, 5, 10]
            let totalBleed = 0

            for (const camY of heights) {
                for (const dist of distances) {
                    for (let i = 0; i < 16; i++) {
                        const angle = (i / 16) * Math.PI * 2
                        testCam.position.set(
                            cx + Math.cos(angle) * dist,
                            camY,
                            cz + Math.sin(angle) * dist,
                        )
                        testCam.lookAt(cx, 0, cz)
                        testCam.updateMatrixWorld()

                        gl.setRenderTarget(rt)
                        gl.render(scene, testCam)
                        gl.setRenderTarget(null)
                        gl.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, buf)

                        let skyPx = 0
                        let checked = 0
                        const samples: string[] = []

                        for (let row = Math.floor(SIZE * 0.3); row < Math.floor(SIZE * 0.7); row++) {
                            for (let col = Math.floor(SIZE * 0.1); col < Math.floor(SIZE * 0.9); col++) {
                                const idx = (row * SIZE + col) * 4
                                const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2]
                                checked++
                                if (b > 130 && b > r * 1.25 && r + g + b > 250 && b > g) {
                                    skyPx++
                                    if (samples.length < 3) samples.push(`rgb(${r},${g},${b})`)
                                }
                            }
                        }

                        if (skyPx > 0) {
                            totalBleed += skyPx
                            const deg = ((angle * 180) / Math.PI).toFixed(0)
                            bleedResults.push(
                                `  h=${camY} d=${dist} @${deg}°: ${skyPx}/${checked} px [${samples.join(', ')}]`,
                            )
                        }
                    }
                }
            }

            rt.dispose()

            console.log('%c=== WALL BLEED DIAGNOSTIC ===', 'font-weight:bold;font-size:14px;color:red')
            if (totalBleed === 0) {
                console.log('%cALL CLEAR — no sky bleed in base render (without post-processing)', 'color:green;font-weight:bold')
                console.log('If you still see bleed on screen, it is caused by N8AO post-processing.')
            } else {
                console.log(`%cBLEED DETECTED — ${totalBleed} sky pixels across ${bleedResults.length} views`, 'color:red;font-weight:bold')
                bleedResults.forEach((l) => console.log(l))
            }
            console.log('%c=============================', 'font-weight:bold;font-size:14px;color:red')
        }, 2000)

        return () => clearTimeout(timer)
    }, [gl, scene, roomPolygons])

    return null
}
