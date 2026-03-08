const UI_ONLY_KEYS = new Set([
    'showGenerateDialog', 'showSidebar', 'isSaving', 'isLoading',
    'userSpaces', 'communitySpaces', 'userId', 'editingSpaceId',
    'generationTasks', 'generatingCount', 'pastHistory', 'futureHistory',
    'cinematicMode', 'measurePoints', 'measureDistance', 'getScreenshot',
])

export function shouldInvalidateScene(
    prev: Record<string, unknown>,
    next: Record<string, unknown>,
) {
    for (const key of Object.keys(next)) {
        if (UI_ONLY_KEYS.has(key)) continue
        if (next[key] !== prev[key]) return true
    }
    return false
}
