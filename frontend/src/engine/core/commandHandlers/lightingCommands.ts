import type { EngineCommand } from '@/engine/core/commandTypes'
import { useStore } from '@/store/useStore'

type EngineStore = ReturnType<typeof useStore.getState>
type LightingCommand = Extract<EngineCommand,
    { type: 'setLighting' }
    | { type: 'placeLight' }
    | { type: 'updateLight' }
    | { type: 'selectLight' }
    | { type: 'removeLight' }
>

export function handleLightingCommand(store: EngineStore, command: LightingCommand) {
    switch (command.type) {
        case 'setLighting':
            store.setLighting(command.lighting)
            return null
        case 'placeLight': {
            const id = store.placeLight(command.light)
            if (command.selectPlaced) {
                store.setSelection({ type: 'light', id })
            }
            return id
        }
        case 'updateLight':
            store.updateLight(command.lightId, command.update, command.noCommit)
            return null
        case 'selectLight':
            store.setSelection({ type: 'light', id: command.lightId })
            return null
        case 'removeLight':
            store.removeLight(command.lightId)
            return null
    }
}
