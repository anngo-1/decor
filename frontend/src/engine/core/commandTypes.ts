import type { EnvironmentId } from '@/engine/config/environment'
import type { PlacedLight } from '@/types'

export type EngineCommand =
    | { type: 'setEnvironmentPreset'; preset: EnvironmentId }
    | { type: 'toggleShadows' }
    | { type: 'setLighting'; lighting: { azimuth?: number; elevation?: number; intensity?: number } }
    | { type: 'placeLight'; light: Omit<PlacedLight, 'id'>; selectPlaced?: boolean }
    | { type: 'updateLight'; lightId: string; update: Partial<Omit<PlacedLight, 'id'>>; noCommit?: boolean }
    | { type: 'selectLight'; lightId: string }
    | { type: 'removeLight'; lightId: string }
    | { type: 'updateItemRotation'; itemId: string; rotation: [number, number, number]; noCommit?: boolean }
    | { type: 'updateItemScale'; itemId: string; scale: number; noCommit?: boolean }
    | { type: 'updateItemPosition'; itemId: string; position: [number, number, number]; noCommit?: boolean }
    | { type: 'updateWindowSize'; itemId: string; width: number; height: number; noCommit?: boolean }
    | { type: 'removeItem'; itemId: string }
