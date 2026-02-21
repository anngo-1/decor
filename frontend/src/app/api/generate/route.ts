import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

const FAL_KEY = process.env.FAL_KEY

fal.config({ credentials: FAL_KEY })

export async function POST(req: NextRequest) {
    if (!FAL_KEY) {
        return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 503 })
    }

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

        const imageUrl = await fal.storage.upload(file)

        const result = await fal.subscribe('fal-ai/hunyuan3d-v3/image-to-3d', {
            input: {
                input_image_url: imageUrl,
            },
        })

        const modelUrl = result.data?.glb?.url || result.data?.model_glb?.url

        return NextResponse.json({
            taskId: result.requestId,
            status: 'completed',
            modelUrl
        })
    } catch (e: unknown) {
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}
