export type AiErrorType = 'timeout' | 'rate_limited' | 'error' | 'invalid_response'

export class AiError extends Error {
  constructor(
    public type: AiErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AiError'
  }
}

export interface CurriculumContextEntity {
  id: string
  name: string
  nameAr: string
}

export interface CurriculumContext {
  grade: CurriculumContextEntity & { level: number }
  subject: CurriculumContextEntity
  unit: CurriculumContextEntity
  domain: CurriculumContextEntity
  lesson: CurriculumContextEntity
  skill: CurriculumContextEntity & { category: string; descriptionAr: string }
}

export interface AiGenerationRequest {
  skillId: string
  gameType: string
  difficulty: string
  questionCount: number
  locale?: string
}

export interface AiQuestion {
  questionText: string
  questionType: string
  data: Record<string, unknown>
  explanation?: string
}

export interface AiGenerationResult {
  activity: {
    title: string
    titleAr: string
    description: string
    descriptionAr: string
    questions: AiQuestion[]
  }
}

export interface AiRemediationRequest {
  studentId?: string
  skillId: string
  weaknessDescription: string
  gameType?: string
  difficulty?: string
}

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiChatRequest {
  messages: AiChatMessage[]
  classId?: string
  skillId?: string
}

export interface AiExplanationRequest {
  skillId: string
  studentId?: string
  classId?: string
}

export interface CallClaudeResult {
  content: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}
