import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '@/store/useStore'
import {
    clearCommandMiddlewares,
    getEngineCommandStats,
    registerCommandMiddleware,
    resetEngineCommandStats,
    runEngineCommand,
} from '@/engine/core/commands'
import type { EngineCommand } from '@/engine/core/commandTypes'
import { replayCommandStream } from '@/engine/core/replay'

function resetEngineState() {
    useStore.setState({
        roomPolygons: [],
        currentWallPoints: [],
        isDrawingWall: false,
        activePolygonId: null,
        placedItems: [
            {
                id: 'item-1',
                name: 'Chair',
                modelUrl: '/chair.glb',
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: 1,
            },
        ],
        placedLights: [
            {
                id: 'light-1',
                position: [0, 2, 0],
                color: '#ffffff',
                intensity: 2,
                distance: 10,
            },
        ],
        selection: null,
        shadowsEnabled: true,
        sunAzimuth: 45,
        sunElevation: 45,
        sunIntensity: 1,
        environmentPreset: 'city',
        pastHistory: [],
        futureHistory: [],
    })
}

function projection() {
    const s = useStore.getState()
    return {
        items: s.placedItems,
        lights: s.placedLights,
        selection: s.selection,
        shadowsEnabled: s.shadowsEnabled,
        lighting: {
            azimuth: s.sunAzimuth,
            elevation: s.sunElevation,
            intensity: s.sunIntensity,
        },
        environmentPreset: s.environmentPreset,
    }
}

describe('engine commands', () => {
    beforeEach(() => {
        clearCommandMiddlewares()
        resetEngineCommandStats()
        resetEngineState()
    })

    it('applies same command stream deterministically', () => {
        const commands: EngineCommand[] = [
            { type: 'setEnvironmentPreset', preset: 'dawn' },
            { type: 'toggleShadows' },
            { type: 'setLighting', lighting: { azimuth: 120, elevation: 35, intensity: 1.8 } },
            { type: 'updateItemScale', itemId: 'item-1', scale: 2.1, noCommit: true },
            { type: 'updateItemRotation', itemId: 'item-1', rotation: [0, 1.2, 0], noCommit: true },
            { type: 'updateLight', lightId: 'light-1', update: { intensity: 5.5, distance: 14 }, noCommit: true },
        ]

        commands.forEach((c) => runEngineCommand(c))
        const first = projection()

        resetEngineState()
        resetEngineCommandStats()

        commands.forEach((c) => runEngineCommand(c))
        const second = projection()

        expect(second).toEqual(first)
    })

    it('runs middleware hooks and tracks command stats', () => {
        const beforeTypes: string[] = []
        const afterTypes: string[] = []

        registerCommandMiddleware({
            before: ({ command }) => {
                beforeTypes.push(command.type)
                if (command.type === 'setLighting') {
                    return { ...command, lighting: { ...command.lighting, intensity: 3 } }
                }
            },
            after: ({ command }) => {
                afterTypes.push(command.type)
            },
        })

        runEngineCommand({ type: 'setLighting', lighting: { intensity: 1 } })
        runEngineCommand({ type: 'toggleShadows' })

        expect(useStore.getState().sunIntensity).toBe(3)
        expect(beforeTypes).toEqual(['setLighting', 'toggleShadows'])
        expect(afterTypes).toEqual(['setLighting', 'toggleShadows'])

        const stats = getEngineCommandStats()
        expect(stats.total).toBe(2)
        expect(stats.byType.setLighting).toBe(1)
        expect(stats.byType.toggleShadows).toBe(1)
        expect(stats.lastCommandAt).not.toBeNull()
    })

    it('replays command streams and returns per-command timing metadata', () => {
        const stream: EngineCommand[] = [
            { type: 'setEnvironmentPreset', preset: 'sunset' },
            { type: 'setLighting', lighting: { intensity: 2.2 } },
            { type: 'updateItemScale', itemId: 'item-1', scale: 1.3, noCommit: true },
        ]

        const replay = replayCommandStream(stream)
        expect(replay).toHaveLength(stream.length)
        replay.forEach((entry, idx) => {
            expect(entry.command).toEqual(stream[idx])
            expect(entry.durationMs).toBeGreaterThanOrEqual(0)
        })

        expect(useStore.getState().environmentPreset).toBe('sunset')
        expect(useStore.getState().sunIntensity).toBe(2.2)
        expect(useStore.getState().placedItems[0].scale).toBe(1.3)
    })
})
