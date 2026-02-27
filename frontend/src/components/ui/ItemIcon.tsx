'use client'

import {
    Armchair, Table2, Bed, Lamp, Box, BookOpen, Tv, Coffee, AppWindow
} from 'lucide-react'

const iconMap: Record<string, React.ReactNode> = {
    sofa: <Armchair className="h-10 w-10 text-violet-300 opacity-60" />,
    chair: <Armchair className="h-10 w-10 text-blue-300 opacity-60" />,
    table: <Table2 className="h-10 w-10 text-amber-300 opacity-60" />,
    bed: <Bed className="h-10 w-10 text-pink-300 opacity-60" />,
    lamp: <Lamp className="h-10 w-10 text-yellow-300 opacity-60" />,
    tv: <Tv className="h-10 w-10 text-cyan-300 opacity-60" />,
    coffee: <Coffee className="h-10 w-10 text-orange-300 opacity-60" />,
    book: <BookOpen className="h-10 w-10 text-green-300 opacity-60" />,
    window: <AppWindow className="h-10 w-10 text-sky-300 opacity-60" />,
}

export function ItemIcon({ name }: { name: string }) {
    const lower = name.toLowerCase()
    for (const key of Object.keys(iconMap)) {
        if (lower.includes(key)) return <>{iconMap[key]}</>
    }
    return <Box className="h-10 w-10 text-gray-500 opacity-60" />
}
