export function isLowPerfDevice() {
    if (typeof window === 'undefined') return false
    const nav = navigator as Navigator & { deviceMemory?: number }
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const lowCores = (nav.hardwareConcurrency ?? 8) <= 6
    const lowMemory = (nav.deviceMemory ?? 8) <= 4
    return coarsePointer || lowCores || lowMemory
}
