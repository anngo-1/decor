import React, { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { extend, useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

type InfiniteGridProps = Omit<ThreeElements['mesh'], 'args'> & {
    args: [number, number]
    cellColor?: string
    sectionColor?: string
    cellSize?: number
    sectionSize?: number
    followCamera?: boolean
    infiniteGrid?: boolean
    fadeDistance?: number
    fadeStrength?: number
    fadeFrom?: number
    cellThickness?: number
    sectionThickness?: number
    side?: THREE.Side
}

// A custom Grid material that analytically fades out high-frequency cells to prevent moiré aliasing.
const GridMaterial = shaderMaterial(
    {
        cellSize: 0.5,
        sectionSize: 1,
        fadeDistance: 100,
        fadeStrength: 1,
        fadeFrom: 1,
        cellThickness: 0.5,
        sectionThickness: 1,
        cellColor: new THREE.Color(),
        sectionColor: new THREE.Color(),
        infiniteGrid: false,
        followCamera: false,
        worldCamProjPosition: new THREE.Vector3(),
        worldPlanePosition: new THREE.Vector3(),
    },
    // Vertex Shader
    `
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform vec3 worldPlanePosition;
    uniform float fadeDistance;
    uniform bool infiniteGrid;
    uniform bool followCamera;

    void main() {
      localPosition = position.xzy;
      if (infiniteGrid) localPosition *= 1.0 + fadeDistance;
      
      worldPosition = modelMatrix * vec4(localPosition, 1.0);
      if (followCamera) {
        worldPosition.xyz += (worldCamProjPosition - worldPlanePosition);
        localPosition = (inverse(modelMatrix) * worldPosition).xyz;
      }

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
    `,
    // Fragment Shader
    `
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform float cellSize;
    uniform float sectionSize;
    uniform vec3 cellColor;
    uniform vec3 sectionColor;
    uniform float fadeDistance;
    uniform float fadeStrength;
    uniform float fadeFrom;
    uniform float cellThickness;
    uniform float sectionThickness;

    float getGrid(float size, float thickness) {
      vec2 r = localPosition.xz / size;
      
      // How much of a cell is covered by one pixel (density)
      vec2 lod = fwidth(r);
      
      // If a pixel covers more than 0.5 of a cell, start fading it out to prevent aliasing.
      // If it covers >= 1.0 of a cell (Nyquist limit), fully fade it to 0.
      float fade = smoothstep(1.0, 0.4, max(lod.x, lod.y));
      
      vec2 grid = abs(fract(r - 0.5) - 0.5) / lod;
      float line = min(grid.x, grid.y) + 1.0 - thickness;
      return (1.0 - min(line, 1.0)) * fade;
    }

    void main() {
      float g1 = getGrid(cellSize, cellThickness);
      float g2 = getGrid(sectionSize, sectionThickness);

      vec3 from = worldCamProjPosition*vec3(fadeFrom);
      float dist = distance(from, worldPosition.xyz);
      float d = 1.0 - min(dist / fadeDistance, 1.0);
      
      vec3 color = mix(cellColor, sectionColor, min(1.0, sectionThickness * g2));

      gl_FragColor = vec4(color, (g1 + g2) * pow(d, fadeStrength));
      gl_FragColor.a = mix(0.75 * gl_FragColor.a, gl_FragColor.a, g2);
      if (gl_FragColor.a <= 0.0) discard;

      #include <colorspace_fragment>
    }
    `
)

extend({ GridMaterial })

export const InfiniteGrid = forwardRef<THREE.Mesh, InfiniteGridProps>((props, fRef) => {
    const {
        args,
        cellColor = '#000000',
        sectionColor = '#2080ff',
        cellSize = 0.5,
        sectionSize = 1,
        followCamera = false,
        infiniteGrid = false,
        fadeDistance = 100,
        fadeStrength = 1,
        fadeFrom = 1,
        cellThickness = 0.5,
        sectionThickness = 1,
        side = THREE.BackSide,
        ...rest
    } = props

    const ref = useRef<THREE.Mesh>(null!)
    React.useImperativeHandle(fRef, () => ref.current, [])

    const plane = useRef(new THREE.Plane())
    const upVector = useRef(new THREE.Vector3(0, 1, 0))
    const zeroVector = useRef(new THREE.Vector3(0, 0, 0))

    useFrame((state) => {
        if (!ref.current) return
        plane.current.setFromNormalAndCoplanarPoint(upVector.current, zeroVector.current).applyMatrix4(ref.current.matrixWorld)
        const gridMaterial = ref.current.material as THREE.ShaderMaterial & {
            uniforms: {
                worldCamProjPosition: { value: THREE.Vector3 }
                worldPlanePosition: { value: THREE.Vector3 }
            }
        }
        const worldCamProjPosition = gridMaterial.uniforms.worldCamProjPosition
        const worldPlanePosition = gridMaterial.uniforms.worldPlanePosition
        plane.current.projectPoint(state.camera.position, worldCamProjPosition.value)
        worldPlanePosition.value.set(0, 0, 0).applyMatrix4(ref.current.matrixWorld)
    })

    const cellColorObj = useMemo(() => new THREE.Color(cellColor), [cellColor])
    const sectionColorObj = useMemo(() => new THREE.Color(sectionColor), [sectionColor])

    const uniforms1 = {
        cellSize,
        sectionSize,
        cellColor: cellColorObj,
        sectionColor: sectionColorObj,
        cellThickness,
        sectionThickness,
    }
    const uniforms2 = {
        fadeDistance,
        fadeStrength,
        fadeFrom,
        infiniteGrid,
        followCamera,
    }

    return (
        <mesh ref={ref} frustumCulled={false} {...rest}>
            <gridMaterial
                transparent
                depthWrite={false}
                extensions-derivatives
                side={side}
                {...uniforms1}
                {...uniforms2}
            />
            <planeGeometry args={args} />
        </mesh>
    )
})

InfiniteGrid.displayName = 'InfiniteGrid'
