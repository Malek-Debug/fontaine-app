export {
  AiError,
  type AiErrorType,
  type CurriculumContext,
  type CurriculumContextEntity,
  type AiGenerationRequest,
  type AiGenerationResult,
  type AiQuestion,
  type AiRemediationRequest,
  type AiChatMessage,
  type AiChatRequest,
  type AiExplanationRequest,
  type CallClaudeResult,
} from './types'

export {
  type AiProvider,
  type AiCompletionOptions,
  type AiChatTurn,
  setAiProvider,
  getAiProvider,
  requireAiProvider,
  isAiAvailable,
  callAi,
  chatAi,
} from './client'

export { getCurriculumContextForSkill, formatCurriculumContext } from './curriculum-context'

export {
  buildActivityGenerationPrompt,
  buildRemediationPrompt,
  buildSkillExplanationPrompt,
  buildChatSystemPrompt,
} from './prompts'

export { validateAiActivityOutput } from './validation'

export { initializeAiProvider, resetAiProvider } from './init'

export { MockAiProvider } from './providers/mock'
export { OllamaAiProvider } from './providers/ollama'
