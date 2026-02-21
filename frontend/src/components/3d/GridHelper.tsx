'use client'


interface GridHelperProps {
    size?: number
    divisions?: number
    snapInterval?: number
}

export function GridHelper({ size = 30, divisions = 60 }: GridHelperProps) {
    return (
        <>
            {/* Main grid */}
            <gridHelper
                args={[size, divisions, '#e0dfe5', '#ece9f0']}
                position={[0, 0.001, 0]}
            />
            {/* Accent lines every 5m */}
            <gridHelper
                args={[size, divisions / 5, '#c5c2d4', '#c5c2d4']}
                position={[0, 0.002, 0]}
            />
        </>
    )
}
