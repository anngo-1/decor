type PointerDragOptions = {
    canvas: HTMLCanvasElement
    onMove: (event: PointerEvent) => void
    onEnd?: () => void
}

export function beginPointerDrag({ canvas, onMove, onEnd }: PointerDragOptions) {
    const handleMove = (event: PointerEvent) => {
        onMove(event)
    }

    const handleUp = () => {
        cleanup()
        onEnd?.()
    }

    const cleanup = () => {
        canvas.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
    }

    canvas.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)

    return cleanup
}
