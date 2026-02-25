export function formatDim(meters: number) {
    if (meters < 1) return `${Math.round(meters * 100)}cm`
    return `${meters.toFixed(1)}m`
}
