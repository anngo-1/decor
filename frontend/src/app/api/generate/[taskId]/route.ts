import { NextRequest, NextResponse } from 'next/server'

const FAL_KEY = process.env.FAL_KEY

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    if (!FAL_KEY) {
        return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 503 })
    }

    const { taskId } = await params

    return NextResponse.json({
        status: 'completed',
        progress: 100,
        modelUrl: null,
    })
}
