import type { EngineCommand } from '@/engine/core/commandTypes'
import { runEngineCommand } from '@/engine/core/commands'

export type CommandReplayResult = {
    command: EngineCommand
    result: unknown
    durationMs: number
}

export function replayCommandStream(commands: EngineCommand[]): CommandReplayResult[] {
    return commands.map((command) => {
        const startedAt = performance.now()
        const result = runEngineCommand(command)
        const durationMs = performance.now() - startedAt
        return { command, result, durationMs }
    })
}
