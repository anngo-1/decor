import * as THREE from 'three'

const TARGET_SIZE = 1.5

type ModelTemplateCacheEntry = {
    template: THREE.Object3D
    dimensions: [number, number, number]
    lastUsedAt: number
}

type MaterialCacheEntry = {
    material: THREE.Material
    disposable: boolean
}

const materialCache = new Map<string, MaterialCacheEntry>()
const materialKeysByModelUrl = new Map<string, Set<string>>()
const normalizedModelCache = new Map<string, ModelTemplateCacheEntry>()

const _boundsSize = new THREE.Vector3()
const _boundsCenter = new THREE.Vector3()
const _tempBox = new THREE.Box3()

function getActualBoundingBox(object: THREE.Object3D): THREE.Box3 | null {
    object.updateMatrixWorld(true)

    const combinedBox = new THREE.Box3()
    let hasMesh = false

    object.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh || !mesh.geometry || !mesh.visible) return
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
        const geomBox = mesh.geometry.boundingBox
        if (!geomBox) return
        _tempBox.copy(geomBox).applyMatrix4(mesh.matrixWorld)
        combinedBox.union(_tempBox)
        hasMesh = true
    })

    if (!hasMesh) return null
    return combinedBox
}

function normalizeBoundingBox(object: THREE.Object3D, targetSize = TARGET_SIZE): [number, number, number] | null {
    const combinedBox = getActualBoundingBox(object)
    if (!combinedBox) return null

    const size = combinedBox.getSize(_boundsSize)
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim === 0) return null

    const scaleFactor = targetSize / maxDim
    const center = combinedBox.getCenter(_boundsCenter)

    object.scale.setScalar(scaleFactor)
    object.position.x -= center.x
    object.position.z -= center.z
    object.position.y -= combinedBox.min.y

    return [size.x * scaleFactor, size.y * scaleFactor, size.z * scaleFactor]
}

function clearMaterialsForModel(modelUrl: string) {
    const keys = materialKeysByModelUrl.get(modelUrl)
    if (!keys) return
    for (const key of keys) {
        const cached = materialCache.get(key)
        if (!cached) continue
        if (cached.disposable) cached.material.dispose()
        materialCache.delete(key)
    }
    materialKeysByModelUrl.delete(modelUrl)
}

export function clearModelTemplate(modelUrl: string) {
    normalizedModelCache.delete(modelUrl)
    clearMaterialsForModel(modelUrl)
}

export function pruneModelTemplateCache(activeModelUrls: Set<string>, cacheLimit: number) {
    if (normalizedModelCache.size <= cacheLimit) return
    const candidates = [...normalizedModelCache.entries()]
        .filter(([modelUrl]) => !activeModelUrls.has(modelUrl))
        .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt)
    for (const [modelUrl] of candidates) {
        if (normalizedModelCache.size <= cacheLimit) break
        clearModelTemplate(modelUrl)
    }
}

export function getCachedModelUrls() {
    return [...normalizedModelCache.keys()]
}

export function getModelCacheStats() {
    return {
        templates: normalizedModelCache.size,
        materials: materialCache.size,
        modelMaterialSets: materialKeysByModelUrl.size,
    }
}

function convertMaterial(modelUrl: string, m: THREE.Material) {
    const key = `${modelUrl}:${m.uuid}`
    const cached = materialCache.get(key)
    if (cached) return cached.material

    let newMat: THREE.Material
    let disposable = false
    if ((m as { type?: string }).type === 'MeshBasicMaterial') {
        const basic = m as THREE.MeshBasicMaterial
        newMat = new THREE.MeshStandardMaterial({
            color: basic.color,
            map: basic.map,
            transparent: basic.transparent,
            opacity: basic.opacity,
            side: basic.side,
            alphaTest: basic.alphaTest,
            roughness: 0.8,
            metalness: 0,
            vertexColors: basic.vertexColors,
        })
        disposable = true
    } else {
        newMat = m
    }

    materialCache.set(key, { material: newMat, disposable })
    const keys = materialKeysByModelUrl.get(modelUrl) ?? new Set<string>()
    keys.add(key)
    materialKeysByModelUrl.set(modelUrl, keys)
    return newMat
}

export function getOrCreateModelTemplate(modelUrl: string, scene: THREE.Object3D): ModelTemplateCacheEntry {
    const cached = normalizedModelCache.get(modelUrl)
    if (cached) {
        cached.lastUsedAt = performance.now()
        normalizedModelCache.delete(modelUrl)
        normalizedModelCache.set(modelUrl, cached)
        return cached
    }

    const template = scene.clone(true)
    template.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return
        const mesh = child as THREE.Mesh
        mesh.castShadow = false
        mesh.receiveShadow = false
        if (!mesh.material) return

        if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((m) => convertMaterial(modelUrl, m))
        } else {
            mesh.material = convertMaterial(modelUrl, mesh.material)
        }

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => {
            if (mat.userData.originalTransparent === undefined) {
                mat.userData.originalTransparent = mat.transparent
                mat.userData.originalOpacity = mat.opacity
            }
        })
    })

    const dimensions = normalizeBoundingBox(template, TARGET_SIZE) ?? [1, 1, 1]

    const entry = { template, dimensions, lastUsedAt: performance.now() }
    normalizedModelCache.set(modelUrl, entry)
    return entry
}
