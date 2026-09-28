import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAiAvailable, getAiProvider, initializeAiProvider } from '@/lib/ai'
import { OllamaAiProvider } from '@/lib/ai/providers/ollama'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await initializeAiProvider()
    const available = await isAiAvailable()
    const provider = getAiProvider()

    const providerName = provider?.name || null
    let model: string | null = null
    let providerType: 'ollama' | 'mock' | null = null

    if (provider instanceof OllamaAiProvider) {
      providerType = 'ollama'
      model = provider.getModelName()
    } else if (provider?.name === 'mock') {
      providerType = 'mock'
      model = null
    }

    return NextResponse.json({
      available,
      provider: providerName,
      providerType,
      model,
    })
  } catch {
    return NextResponse.json({ available: false, provider: null, providerType: null, model: null })
  }
}
