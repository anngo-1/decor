import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const FAL_KEY = process.env.FAL_KEY

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    if (!FAL_KEY) {
        return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 503 })
    }

    const { taskId } = await params

    return NextResponse.json({
        taskId,
        status: 'completed',
        progress: 100,
        modelUrl: null,
    })
}
