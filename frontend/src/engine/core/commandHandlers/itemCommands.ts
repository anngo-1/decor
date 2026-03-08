import type { EngineCommand } from '@/engine/core/commandTypes'
import { useStore } from '@/store/useStore'

type EngineStore = ReturnType<typeof useStore.getState>
type ItemCommand = Extract<EngineCommand,
    { type: 'updateItemRotation' }
    | { type: 'updateItemScale' }
    | { type: 'updateItemPosition' }
    | { type: 'updateWindowSize' }
    | { type: 'removeItem' }
>

export function handleItemCommand(store: EngineStore, command: ItemCommand) {
    switch (command.type) {
        case 'updateItemRotation':
            store.updateItemRotation(command.itemId, command.rotation, command.noCommit)
            return null
        case 'updateItemScale':
            store.updateItemScale(command.itemId, command.scale, command.noCommit)
            return null
        case 'updateItemPosition':
            store.updateItemPosition(command.itemId, command.position, command.noCommit)
            return null
        case 'updateWindowSize':
            store.updateWindowSize(command.itemId, command.width, command.height, command.noCommit)
            return null
        case 'removeItem':
            store.removeItem(command.itemId)
            return null
    }
}
