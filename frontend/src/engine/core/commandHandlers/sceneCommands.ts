import type { EngineCommand } from '@/engine/core/commandTypes'
import { useStore } from '@/store/useStore'

type EngineStore = ReturnType<typeof useStore.getState>
type SceneCommand = Extract<EngineCommand,
    { type: 'setEnvironmentPreset' }
    | { type: 'toggleShadows' }
>

export function handleSceneCommand(store: EngineStore, command: SceneCommand) {
    switch (command.type) {
        case 'setEnvironmentPreset':
            store.setEnvironmentPreset(command.preset)
            return null
        case 'toggleShadows':
            store.toggleShadows()
            return null
    }
}
