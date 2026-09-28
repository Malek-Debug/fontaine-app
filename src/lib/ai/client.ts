import { AiError, type CallClaudeResult } from './types'

export interface AiProvider {
  name: string
  isAvailable(): Promise<boolean>
  complete(prompt: string, options?: AiCompletionOptions): Promise<CallClaudeResult>
  chat(messages: AiChatTurn[], options?: AiCompletionOptions): Promise<CallClaudeResult>
}

export interface AiCompletionOptions {
  maxTokens?: number
  temperature?: number
  system?: string
}

export interface AiChatTurn {
  role: 'user' | 'assistant'
  content: string
}

let activeProvider: AiProvider | null = null

export function setAiProvider(provider: AiProvider): void {
  activeProvider = provider
}

export function getAiProvider(): AiProvider | null {
  return activeProvider
}

export function requireAiProvider(): AiProvider {
  if (!activeProvider) {
    throw new AiError('error', 'No AI provider configured. AI features are currently unavailable.')
  }
  return activeProvider
}

export async function isAiAvailable(): Promise<boolean> {
  if (!activeProvider) return false
  try {
    return await activeProvider.isAvailable()
  } catch {
    return false
  }
}

export async function callAi(
  prompt: string,
  options?: AiCompletionOptions
): Promise<CallClaudeResult> {
  const provider = requireAiProvider()
  return provider.complete(prompt, options)
}

export async function chatAi(
  messages: AiChatTurn[],
  options?: AiCompletionOptions
): Promise<CallClaudeResult> {
  const provider = requireAiProvider()
  return provider.chat(messages, options)
}
