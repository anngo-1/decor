import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _velocity = new THREE.Vector3()

export function useMovementControls({
    orbitRef,
    isPointerLocked,
}: {
    orbitRef: React.RefObject<OrbitControlsImpl | null>
    isPointerLocked: boolean
}) {
    const { camera, invalidate } = useThree()
    const keys = useRef<Set<string>>(new Set())
    const lastTime = useRef(0)

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            keys.current.add(e.key.toLowerCase())
            lastTime.current = performance.now()
            invalidate()
        }
        const up = (e: KeyboardEvent) => {
            keys.current.delete(e.key.toLowerCase())
        }

        window.addEventListener('keydown', down)
        window.addEventListener('keyup', up)

        return () => {
            window.removeEventListener('keydown', down)
            window.removeEventListener('keyup', up)
        }
    }, [invalidate])

    useFrame((state) => {
        if (isPointerLocked && document.pointerLockElement) {
            state.pointer.set(0, 0)
        }

        const activeKeys = keys.current
        if (!activeKeys.size) {
            if (isPointerLocked && orbitRef.current) {
                camera.getWorldDirection(_forward)
                _forward.y = 0
                _forward.normalize()
                orbitRef.current.target.copy(camera.position).add(_forward.multiplyScalar(10))
                orbitRef.current.target.y = camera.position.y
                orbitRef.current.update()
                state.invalidate()
            }
            lastTime.current = 0
            return
        }

        const now = performance.now()
        const dt = lastTime.current > 0 ? Math.min((now - lastTime.current) / 1000, 0.033) : 0.016
        lastTime.current = now

        const speed = 8
        _velocity.set(0, 0, 0)

        camera.getWorldDirection(_forward)
        _forward.y = 0
        _forward.normalize()

        _right.crossVectors(_forward, _up).normalize()

        if (activeKeys.has('w')) _velocity.addScaledVector(_forward, speed * dt)
        if (activeKeys.has('s')) _velocity.addScaledVector(_forward, -speed * dt)
        if (activeKeys.has('a')) _velocity.addScaledVector(_right, -speed * dt)
        if (activeKeys.has('d')) _velocity.addScaledVector(_right, speed * dt)
        if (activeKeys.has(' ')) _velocity.y += speed * dt
        if (activeKeys.has('q')) _velocity.y -= speed * dt

        if (_velocity.lengthSq() > 0) {
            camera.position.add(_velocity)
            const clampedY = Math.max(camera.position.y, 0.5)
            if (clampedY !== camera.position.y) {
                camera.position.set(camera.position.x, clampedY, camera.position.z)
            }

            if (!isPointerLocked && orbitRef.current) {
                orbitRef.current.target.add(_velocity)
                orbitRef.current.update()
            }

            state.invalidate()
        }

        if (isPointerLocked && orbitRef.current) {
            camera.getWorldDirection(_forward)
            _forward.y = 0
            _forward.normalize()
            orbitRef.current.target.copy(camera.position).add(_forward.multiplyScalar(10))
            orbitRef.current.target.y = camera.position.y
            orbitRef.current.update()
        }
    })
}

export function MovementControlsBridge({
    orbitRef,
    isPointerLocked,
}: {
    orbitRef: React.RefObject<OrbitControlsImpl | null>
    isPointerLocked: boolean
}) {
    useMovementControls({ orbitRef, isPointerLocked })
    return null
}
