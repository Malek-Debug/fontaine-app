import { setAiProvider, getAiProvider } from './client'
import { OllamaAiProvider } from './providers/ollama'
import { MockAiProvider } from './providers/mock'

let initialized = false

export async function initializeAiProvider(): Promise<void> {
  if (initialized && getAiProvider()) return
  initialized = true

  // Priority 1: Explicit mock mode (AI_MOCK=true takes precedence)
  if (process.env.AI_MOCK === 'true') {
    setAiProvider(new MockAiProvider())
    console.log('[AI] Using mock provider (AI_MOCK=true)')
    return
  }

  // Priority 2: Ollama (only when OLLAMA_URL is explicitly configured)
  const ollamaUrl = process.env.OLLAMA_URL
  if (ollamaUrl) {
    const ollama = new OllamaAiProvider({
      baseUrl: ollamaUrl,
      model: process.env.OLLAMA_MODEL,
    })

    const available = await ollama.isAvailable()
    if (available) {
      setAiProvider(ollama)
      console.log(`[AI] Using Ollama provider: ${ollama.name} at ${ollama.getBaseUrl()}`)
      return
    }
    console.log(`[AI] Ollama configured at ${ollamaUrl} but not available (model: ${ollama.getModelName()})`)
  }

  // Priority 3: Mock in development mode
  if (process.env.NODE_ENV === 'development') {
    setAiProvider(new MockAiProvider())
    console.log('[AI] Using mock provider (development mode fallback)')
    return
  }

  console.log('[AI] No AI provider available. AI features are disabled.')
}

export function resetAiProvider(): void {
  initialized = false
}
