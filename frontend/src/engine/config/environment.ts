export type EnvironmentId = 'city' | 'apartment' | 'sunset' | 'dawn' | 'night'

export const ENVIRONMENTS: Array<{ id: EnvironmentId; name: string; color: string }> = [
    { id: 'city', name: 'Studio', color: '#f8fafc' },
    { id: 'apartment', name: 'Warm', color: '#fdf4ff' },
    { id: 'sunset', name: 'Sunset', color: '#ffedd5' },
    { id: 'dawn', name: 'Dawn', color: '#e0e7ff' },
    { id: 'night', name: 'Night', color: '#1e1b4b' },
]

export const SKY_PRESETS: Record<EnvironmentId, {
    turbidity: number
    rayleigh: number
    mieCoeff: number
    mieG: number
    elevation?: number
    background: string
    fogColor: string
    fogNear: number
    fogFar: number
}> = {
    city: {
        turbidity: 2.2,
        rayleigh: 1.3,
        mieCoeff: 0.006,
        mieG: 0.8,
        elevation: 28,
        background: '#d9ecff',
        fogColor: '#d6e7f7',
        fogNear: 50,
        fogFar: 180,
    },
    apartment: {
        turbidity: 4,
        rayleigh: 1.7,
        mieCoeff: 0.014,
        mieG: 0.83,
        elevation: 24,
        background: '#efe8e2',
        fogColor: '#ece2d8',
        fogNear: 45,
        fogFar: 160,
    },
    sunset: {
        turbidity: 8,
        rayleigh: 2.5,
        mieCoeff: 0.06,
        mieG: 0.96,
        elevation: 3,
        background: '#ffd8b3',
        fogColor: '#ffd2a6',
        fogNear: 38,
        fogFar: 145,
    },
    dawn: {
        turbidity: 6,
        rayleigh: 2,
        mieCoeff: 0.035,
        mieG: 0.84,
        elevation: 6,
        background: '#cfdcff',
        fogColor: '#c7d3f0',
        fogNear: 42,
        fogFar: 150,
    },
    night: {
        turbidity: 10,
        rayleigh: 0.35,
        mieCoeff: 0.01,
        mieG: 0.82,
        elevation: 1,
        background: '#0a1326',
        fogColor: '#0d1830',
        fogNear: 30,
        fogFar: 115,
    },
}

export const GRID_PRESETS: Record<EnvironmentId, { cellColor: string; sectionColor: string }> = {
    city: { cellColor: '#8f8a9f', sectionColor: '#5f5978' },
    apartment: { cellColor: '#9a8f99', sectionColor: '#6a5a6b' },
    sunset: { cellColor: '#9b8678', sectionColor: '#6f5743' },
    dawn: { cellColor: '#8e8ea4', sectionColor: '#5c5f82' },
    night: { cellColor: '#7d87a7', sectionColor: '#9caad4' },
}
