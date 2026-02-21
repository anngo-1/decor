import { Vector3 } from 'three'

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
  segmentProps?: Record<number, { color?: string }>
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

export type GenerationTask = {
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  modelUrl?: string
  thumbnailUrl?: string
  name: string
}

export type EditorTool = 'select' | 'wall' | 'export' | 'measure'

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
    wallHeight: number
  }
  created_at: string
  updated_at: string
}
