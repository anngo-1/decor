'use client'

import * as THREE from 'three'
import { useWallDrawingInteraction } from '@/engine/runtime/interactions/useWallDrawingInteraction'

const interactionPlaneGeo = new THREE.PlaneGeometry(200, 200)
const interactionPlaneMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
    side: THREE.DoubleSide,
})

export function WallInteractionPlane() {
    const {
        handlePointerMove,
        handlePointerLeave,
        handlePointerDown,
        handlePointerUp,
    } = useWallDrawingInteraction()

    return (
        <mesh
            geometry={interactionPlaneGeo}
            material={interactionPlaneMat}
            position={[0, 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
        />
    )
}
