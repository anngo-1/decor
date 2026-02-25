export type Vec2 = { x: number; z: number }
export type Vec3 = { x: number; y: number; z: number }

/** Describes a flat floor tile — rendered as a coloured slab, no GLB needed. */
export type FloorTile = {
  color: string
  roughness?: number
  metalness?: number
}

export type RoomPolygon = {
  id: string
  points: Vec2[]  // XZ plane
  closed: boolean
  segmentProps?: Record<number, { color?: string; height?: number }>
}

export type PlacedItem = {
  id: string
  name: string
  modelUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  dimensions?: [number, number, number]
  price?: number
  affiliateUrl?: string
  thumbnailUrl?: string
  isGenerated?: boolean
  generationTaskId?: string
  floorTile?: FloorTile
}

export type PlacedLight = {
  id: string
  position: [number, number, number]
  color: string
  intensity: number
  distance: number
}

export type GenerationTask = {
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  modelUrl?: string
  thumbnailUrl?: string
  name: string
}

export type EditorTool = 'select' | 'wall' | 'export' | 'measure'

export type EditorSelection = {
  type: 'item' | 'wall' | 'light'
  id: string
} | null

export type LibraryItem = {
  id: string
  name: string
  modelUrl: string
  thumbnailUrl: string
  price?: number
  affiliateUrl?: string
  category: string
  floorTile?: FloorTile
}

export type Space = {
  id: string
  title: string
  description?: string
  preview_url?: string
  user_id: string
  is_published: boolean
  layout_data: {
    roomPolygons: RoomPolygon[]
    placedItems: PlacedItem[]
    placedLights?: PlacedLight[]
    wallHeight: number
    environmentPreset?: string
    lighting?: {
      azimuth: number
      elevation: number
      intensity: number
    }
  }
  created_at: string
  updated_at: string
}
