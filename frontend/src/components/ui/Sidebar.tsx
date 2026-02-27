'use client'

import { useState } from 'react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { Package2, Search, ArrowUpRight, GripVertical } from 'lucide-react'
import { useStore, SAMPLE_LIBRARY } from '@/store/useStore'
import type { LibraryItem } from '@/types'
import { ItemIcon } from './ItemIcon'

const CATEGORIES = ['All', 'Furniture', 'Decor', 'Lighting', 'Textiles', 'Windows', 'Generated']

// Preload transparent image to prevent drag ghost image rendering race conditions
let emptyImage: HTMLImageElement | null = null
if (typeof window !== 'undefined') {
    emptyImage = new Image()
    emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
}

export function Sidebar() {
    const showSidebar = useStore((s) => s.showSidebar)
    const setDraggedLibraryItem = useStore((s) => s.setDraggedLibraryItem)
    const generationTasks = useStore((s) => s.generationTasks)
    const placeItem = useStore((s) => s.placeItem)
    const setSelection = useStore((s) => s.setSelection)
    const setActiveTool = useStore((s) => s.setActiveTool)

    const [activeCategory, setActiveCategory] = useState('All')
    const [search, setSearch] = useState('')

    // Build generated items from completed tasks
    const generatedItems: LibraryItem[] = generationTasks
        .filter((t) => t.status === 'completed' && t.modelUrl)
        .map((t) => ({
            id: t.taskId,
            name: t.name,
            modelUrl: t.modelUrl!,
            thumbnailUrl: t.thumbnailUrl || '',
            category: 'Generated',
        }))

    const allItems = [...SAMPLE_LIBRARY, ...generatedItems]

    const filtered = allItems.filter((item) => {
        const matchesCat = activeCategory === 'All' || item.category === activeCategory
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
        return matchesCat && matchesSearch
    })

    if (!showSidebar) return null

    return (
        <aside className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-64 flex flex-col gap-2
      bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-2xl shadow-2xl shadow-indigo-100/50 overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 120px)' }}>

            {/* Header */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2 mb-3">
                    <Package2 className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-950">Market</span>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search items..."
                        className="w-full pl-8 pr-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl
              text-xs text-indigo-950 placeholder:text-indigo-300 outline-none focus:border-indigo-400 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* Category pills */}
            <div className="px-3 flex gap-1.5 flex-wrap pb-1">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all duration-150 border ${activeCategory === cat
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-200'
                            : 'bg-white border-indigo-100 text-indigo-400 hover:text-indigo-600 hover:border-indigo-200'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Items grid */}
            <ScrollArea.Root className="flex-1 overflow-hidden">
                <ScrollArea.Viewport className="h-full px-3 pb-4">
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        {filtered.map((item) => (
                            <LibraryCard
                                key={item.id}
                                item={item}
                                onDragStart={(e) => {
                                    if (emptyImage) {
                                        e.dataTransfer.setDragImage(emptyImage, 0, 0)
                                    }
                                    setDraggedLibraryItem(item)
                                }}
                                onDragEnd={() => setDraggedLibraryItem(null)}
                                onPlace={() => {
                                    const id = placeItem({
                                        name: item.name,
                                        modelUrl: item.modelUrl,
                                        position: [0, 0, 0],
                                        rotation: [0, 0, 0],
                                        scale: 1,
                                        price: item.price,
                                        affiliateUrl: item.affiliateUrl,
                                        thumbnailUrl: item.thumbnailUrl,
                                        isGenerated: item.category === 'Generated',
                                        floorTile: item.floorTile,
                                    })
                                    setSelection({ type: 'item', id })
                                    setActiveTool('select')
                                }}
                            />
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-2 text-center py-8 text-gray-500 text-xs">
                                No items found
                            </div>
                        )}
                    </div>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                    orientation="vertical"
                    className="flex w-1.5 touch-none select-none p-0.5 mr-0.5"
                >
                    <ScrollArea.Thumb className="relative flex-1 rounded-full bg-indigo-100" />
                </ScrollArea.Scrollbar>
            </ScrollArea.Root>

            <p className="text-center text-[10px] font-medium text-indigo-300 pb-3">
                Drag to scene · Windows snap to walls
            </p>
        </aside>
    )
}

function LibraryCard({
    item,
    onDragStart,
    onDragEnd,
    onPlace,
}: {
    item: LibraryItem
    onDragStart: (e: React.DragEvent) => void
    onDragEnd: () => void
    onPlace: () => void
}) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={(e) => {
                e.preventDefault()
                onPlace()
            }}
            className="group relative flex flex-col rounded-2xl border border-indigo-50 bg-indigo-50/20
        hover:border-indigo-400 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 cursor-grab active:cursor-grabbing overflow-hidden"
        >
            {/* Thumbnail area */}
            <div className="h-24 bg-white flex items-center justify-center overflow-hidden rounded-t-2xl relative">
                {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" draggable={false} />
                ) : (
                    <ItemIcon name={item.name} />
                )}

                {/* Ecommerce Hover Overlay */}
                <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-white text-indigo-600 text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1.5">
                        <GripVertical className="h-3 w-3" />
                        <span>DRAG TO SCENE</span>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-2.5">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{item.category}</span>
                    <p className="text-[11px] font-bold text-indigo-950 truncate leading-tight">{item.name}</p>
                </div>
                {item.price && (
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[12px] text-indigo-600 font-black">${item.price}</span>
                        {item.affiliateUrl && item.affiliateUrl !== '#' && (
                            <a
                                href={item.affiliateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-6 w-6 flex items-center justify-center bg-indigo-50 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-full transition-all"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ArrowUpRight className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
