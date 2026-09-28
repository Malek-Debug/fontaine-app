import { z } from 'zod'
import { questionDataSchema } from '@/lib/validators'
import { AiError, type AiGenerationResult, type AiQuestion } from './types'

const aiActivityOutputSchema = z.object({
  title: z.string().min(1),
  titleAr: z.string().min(1),
  description: z.string().default(''),
  descriptionAr: z.string().default(''),
  questions: z.array(
    z.object({
      questionText: z.string().min(1),
      questionType: z.string().min(1),
      data: z.record(z.string(), z.unknown()),
      explanation: z.string().optional().default(''),
    })
  ),
})

function extractJson(raw: string): string {
  let cleaned = raw.trim()

  // Remove BOM and zero-width characters
  cleaned = cleaned.replace(/^﻿/, '').replace(/[​-‍﻿]/g, '')

  // Remove markdown code blocks
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  // Strip any leading text before the first {
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }

  // Fix trailing commas before } or ] (common with small models)
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1')

  // Fix single quotes used as string delimiters (rare but possible)
  // Only if the string doesn't parse as-is
  try {
    JSON.parse(cleaned)
    return cleaned
  } catch {
    // Try replacing single-quoted keys/values
    const singleQuoteFix = cleaned.replace(
      /(?<=[:,\[{]\s*)'([^']*?)'/g,
      '"$1"'
    )
    try {
      JSON.parse(singleQuoteFix)
      return singleQuoteFix
    } catch {
      // Return as-is and let the caller handle the parse error
      return cleaned
    }
  }
}

export function validateAiActivityOutput(
  raw: string,
  gameType: string,
  questionCount: number
): AiGenerationResult {
  const jsonStr = extractJson(raw)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new AiError(
      'invalid_response',
      'AI response is not valid JSON. Please try generating again.',
      { raw: raw.substring(0, 500) }
    )
  }

  const outerResult = aiActivityOutputSchema.safeParse(parsed)
  if (!outerResult.success) {
    throw new AiError(
      'invalid_response',
      `AI output structure is invalid: ${outerResult.error.issues.map((i) => i.message).join(', ')}`,
      { issues: outerResult.error.issues }
    )
  }

  const activity = outerResult.data

  if (activity.questions.length === 0) {
    throw new AiError('invalid_response', 'AI generated zero questions. Please try again.')
  }

  const validatedQuestions: AiQuestion[] = []
  const errors: string[] = []

  for (let i = 0; i < activity.questions.length; i++) {
    const q = activity.questions[i]
    const dataWithType: Record<string, unknown> = { ...q.data, type: gameType }

    if (gameType === 'true_false' && !dataWithType.statement && q.questionText) {
      dataWithType.statement = q.questionText
    }
    if (gameType === 'true_false' && typeof dataWithType.correctAnswer === 'string') {
      dataWithType.correctAnswer = dataWithType.correctAnswer === 'true'
    }

    if (gameType === 'quiz' && Array.isArray(dataWithType.options)) {
      const ids = 'abcdefghij'
      const opts = dataWithType.options as Array<Record<string, unknown>>
      for (let j = 0; j < opts.length; j++) {
        if (!opts[j].id) opts[j].id = ids[j] || String(j)
      }
      if (!dataWithType.correctOptionId) {
        const correct = dataWithType.correctAnswer ?? dataWithType.correct ?? dataWithType.answer
        if (typeof correct === 'number' && correct < opts.length) {
          dataWithType.correctOptionId = opts[correct].id
        } else if (typeof correct === 'string') {
          dataWithType.correctOptionId = correct
        }
      }
    }

    if (gameType === 'matching' && Array.isArray(dataWithType.pairs)) {
      const pairs = dataWithType.pairs as Array<Record<string, unknown>>
      for (let j = 0; j < pairs.length; j++) {
        if (!pairs[j].id) pairs[j].id = String(j + 1)
      }
    }

    const dataResult = questionDataSchema.safeParse(dataWithType)
    if (!dataResult.success) {
      errors.push(
        `Question ${i + 1}: ${dataResult.error.issues.map((issue) => issue.message).join(', ')}`
      )
      continue
    }

    validatedQuestions.push({
      questionText: q.questionText,
      questionType: gameType,
      data: dataResult.data as unknown as Record<string, unknown>,
      explanation: q.explanation || '',
    })
  }

  if (validatedQuestions.length === 0) {
    throw new AiError(
      'invalid_response',
      `All ${activity.questions.length} questions failed validation: ${errors.join('; ')}`,
      { errors }
    )
  }

  if (errors.length > 0) {
    console.warn(
      `[AI Validation] ${errors.length} of ${activity.questions.length} questions failed validation:`,
      errors
    )
  }

  return {
    activity: {
      title: activity.title,
      titleAr: activity.titleAr,
      description: activity.description,
      descriptionAr: activity.descriptionAr,
      questions: validatedQuestions,
    },
  }
}
