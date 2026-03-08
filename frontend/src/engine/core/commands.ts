import type { EngineCommand } from '@/engine/core/commandTypes'
import { handleItemCommand } from '@/engine/core/commandHandlers/itemCommands'
import { handleLightingCommand } from '@/engine/core/commandHandlers/lightingCommands'
import { handleSceneCommand } from '@/engine/core/commandHandlers/sceneCommands'
import { useStore } from '@/store/useStore'

type EngineStore = ReturnType<typeof useStore.getState>
type CommandResult = ReturnType<typeof handleSceneCommand> | ReturnType<typeof handleLightingCommand> | ReturnType<typeof handleItemCommand>

export type CommandBeforeContext = {
    command: EngineCommand
    store: EngineStore
}

export type CommandAfterContext = {
    command: EngineCommand
    store: EngineStore
    result: CommandResult
    error: unknown
}

export type CommandMiddleware = {
    before?: (ctx: CommandBeforeContext) => EngineCommand | void
    after?: (ctx: CommandAfterContext) => void
}

type CommandStats = {
    total: number
    byType: Record<string, number>
    lastCommandAt: number | null
}

const commandStats: CommandStats = {
    total: 0,
    byType: {},
    lastCommandAt: null,
}

const middlewares: CommandMiddleware[] = []

function recordCommand(type: EngineCommand['type']) {
    commandStats.total += 1
    commandStats.byType[type] = (commandStats.byType[type] ?? 0) + 1
    commandStats.lastCommandAt = Date.now()
}

export function getEngineCommandStats(): CommandStats {
    return {
        total: commandStats.total,
        byType: { ...commandStats.byType },
        lastCommandAt: commandStats.lastCommandAt,
    }
}

export function resetEngineCommandStats() {
    commandStats.total = 0
    commandStats.byType = {}
    commandStats.lastCommandAt = null
}

export function registerCommandMiddleware(middleware: CommandMiddleware) {
    middlewares.push(middleware)
    return () => {
        const idx = middlewares.indexOf(middleware)
        if (idx >= 0) middlewares.splice(idx, 1)
    }
}

export function clearCommandMiddlewares() {
    middlewares.length = 0
}

export function runEngineCommand(command: EngineCommand) {
    const store = useStore.getState()
    let currentCommand = command

    for (const middleware of middlewares) {
        if (!middleware.before) continue
        const maybeNext = middleware.before({ command: currentCommand, store })
        if (maybeNext) currentCommand = maybeNext
    }

    recordCommand(currentCommand.type)
    let result: CommandResult = null
    let error: unknown = null

    try {
        switch (currentCommand.type) {
            case 'setEnvironmentPreset':
            case 'toggleShadows':
                result = handleSceneCommand(store, currentCommand)
                break
            case 'setLighting':
            case 'placeLight':
            case 'updateLight':
            case 'selectLight':
            case 'removeLight':
                result = handleLightingCommand(store, currentCommand)
                break
            case 'updateItemRotation':
            case 'updateItemScale':
            case 'updateItemPosition':
            case 'updateWindowSize':
            case 'removeItem':
                result = handleItemCommand(store, currentCommand)
                break
            default:
                result = null
                break
        }
    } catch (err) {
        error = err
        throw err
    } finally {
        for (const middleware of middlewares) {
            middleware.after?.({ command: currentCommand, store, result, error })
        }
    }

    return result
}
