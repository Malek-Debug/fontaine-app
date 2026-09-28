import { AiError, type CallClaudeResult } from '../types'
import type { AiProvider, AiCompletionOptions, AiChatTurn } from '../client'

const DEFAULT_MODEL = 'qwen2.5:3b'
const GENERATE_TIMEOUT_MS = 180_000
const CHAT_TIMEOUT_MS = 120_000
const AVAILABILITY_TIMEOUT_MS = 5_000

export class OllamaAiProvider implements AiProvider {
  name: string
  private baseUrl: string
  private model: string

  constructor(options?: { baseUrl?: string; model?: string }) {
    this.baseUrl = (options?.baseUrl || process.env.OLLAMA_URL || '').replace(/\/+$/, '')
    this.model = options?.model || process.env.OLLAMA_MODEL || DEFAULT_MODEL
    this.name = `ollama:${this.model}`
  }

  getModelName(): string {
    return this.model
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  async isAvailable(): Promise<boolean> {
    if (!this.baseUrl) return false
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), AVAILABILITY_TIMEOUT_MS)
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) return false

      const data = await res.json()
      const models: { name: string }[] = data.models || []
      const modelBase = this.model.split(':')[0]
      return models.some(
        (m) => m.name === this.model || m.name.startsWith(`${this.model}:`) || m.name.startsWith(`${modelBase}:`)
      )
    } catch {
      return false
    }
  }

  async complete(prompt: string, options?: AiCompletionOptions): Promise<CallClaudeResult> {
    const start = Date.now()

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS)

      const body: Record<string, unknown> = {
        model: this.model,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 4096,
        },
      }

      if (options?.system) {
        body.system = options.system
      }

      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        this.handleHttpError(res.status, text)
      }

      const data = await res.json()
      const content = (data.response || '').trim()

      if (!content) {
        throw new AiError('invalid_response', 'Ollama returned an empty response. The model may need more context or a simpler prompt.')
      }

      return {
        content,
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
        durationMs: Date.now() - start,
      }
    } catch (err) {
      if (err instanceof AiError) throw err
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AiError('timeout', 'AI generation timed out. The model may be overloaded or the request was too complex.')
      }
      if (err instanceof Error && (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed'))) {
        throw new AiError('error', 'Cannot connect to Ollama. Please verify that Ollama is running.')
      }
      throw new AiError('error', 'An unexpected error occurred during AI generation.')
    }
  }

  async chat(messages: AiChatTurn[], options?: AiCompletionOptions): Promise<CallClaudeResult> {
    const start = Date.now()

    const ollamaMessages: { role: string; content: string }[] = []
    if (options?.system) {
      ollamaMessages.push({ role: 'system', content: options.system })
    }
    for (const m of messages) {
      ollamaMessages.push({ role: m.role, content: m.content })
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 2048,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        this.handleHttpError(res.status, text)
      }

      const data = await res.json()
      const content = (data.message?.content || '').trim()

      if (!content) {
        throw new AiError('invalid_response', 'Ollama returned an empty chat response.')
      }

      return {
        content,
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
        durationMs: Date.now() - start,
      }
    } catch (err) {
      if (err instanceof AiError) throw err
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AiError('timeout', 'AI chat timed out. Please try a shorter message.')
      }
      if (err instanceof Error && (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed'))) {
        throw new AiError('error', 'Cannot connect to Ollama. Please verify that Ollama is running.')
      }
      throw new AiError('error', 'An unexpected error occurred during AI chat.')
    }
  }

  private handleHttpError(status: number, body: string): never {
    if (status === 404 || body.includes('not found')) {
      throw new AiError(
        'error',
        `Model "${this.model}" is not available. Please run: ollama pull ${this.model}`
      )
    }
    if (status === 500 && body.includes('out of memory')) {
      throw new AiError('error', 'Ollama ran out of memory. Try a smaller model or close other applications.')
    }
    throw new AiError('error', `Ollama returned an error (status ${status}). Please check that Ollama is running correctly.`)
  }
}
