import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getCurriculumContextForSkill,
  buildRemediationPrompt,
  callAi,
  isAiAvailable,
  initializeAiProvider,
  validateAiActivityOutput,
  AiError,
} from '@/lib/ai'

const remediateRequestSchema = z.object({
  skillId: z.string().min(1),
  gameType: z.enum([
    'quiz', 'true_false', 'matching', 'sentence_builder',
    'order_story', 'grammar_detective', 'find_mistake', 'vocabulary',
  ]).optional().default('quiz'),
  questionCount: z.number().int().min(1).max(20).optional().default(5),
  studentId: z.string().optional(),
  classId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await initializeAiProvider()
    if (!(await isAiAvailable())) {
      return NextResponse.json(
        { error: 'ai_unavailable', message: 'AI is not available. No AI provider is configured.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const parsed = remediateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', message: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { skillId, gameType, questionCount, studentId, classId } = parsed.data
    const teacherId = session.user.id

    if (classId) {
      const cls = await prisma.class.findUnique({ where: { id: classId } })
      if (!cls || cls.teacherId !== teacherId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const ctx = await getCurriculumContextForSkill(skillId)

    const resultWhere: Record<string, unknown> = { skillId }
    if (studentId) {
      resultWhere.studentId = studentId
    } else if (classId) {
      const studentIds = (await prisma.student.findMany({
        where: { classId },
        select: { id: true },
      })).map(s => s.id)
      resultWhere.studentId = { in: studentIds }
    }

    const studentResults = await prisma.studentResult.findMany({ where: resultWhere })
    const totalAttempts = studentResults.reduce((sum, r) => sum + r.totalAttempts, 0)
    const correctCount = studentResults.reduce((sum, r) => sum + r.correctCount, 0)

    const wrongAnswers = await prisma.studentAnswer.findMany({
      where: {
        isCorrect: false,
        question: { activity: { skillId } },
        ...(studentId ? { studentId } : {}),
      },
      include: { question: true },
      take: 50,
      orderBy: { answeredAt: 'desc' },
    })

    const mistakeCounts: Record<string, number> = {}
    for (const a of wrongAnswers) {
      const key = a.question.questionText
      mistakeCounts[key] = (mistakeCounts[key] || 0) + 1
    }
    const commonMistakes = Object.entries(mistakeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => `${text} (${count} مرات)`)

    const prompt = buildRemediationPrompt(
      ctx,
      { totalAttempts, correctCount, commonMistakes },
      gameType,
      questionCount
    )
    const result = await callAi(prompt.user, { system: prompt.system })
    const validated = validateAiActivityOutput(result.content, gameType, questionCount)

    const activity = await prisma.$transaction(async (tx) => {
      const act = await tx.activity.create({
        data: {
          title: validated.activity.title,
          titleAr: validated.activity.titleAr,
          description: validated.activity.description,
          descriptionAr: validated.activity.descriptionAr,
          gameType,
          difficulty: 'easy',
          skillId,
          createdBy: teacherId,
          isAiGenerated: true,
          status: 'draft',
          questions: {
            create: validated.activity.questions.map((q, i) => ({
              orderIndex: i,
              questionText: q.questionText,
              questionType: q.questionType,
              data: JSON.stringify(q.data),
              explanation: q.explanation || '',
            })),
          },
        },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      })

      await tx.aiLog.create({
        data: {
          teacherId,
          type: 'remediation',
          skillId,
          activityId: act.id,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          durationMs: result.durationMs,
          status: 'success',
          resultSummary: `Remediation: ${validated.activity.questions.length} ${gameType} questions`,
          approvalStatus: 'draft',
        },
      })

      return act
    })

    return NextResponse.json({
      activityId: activity.id,
      activity: {
        title: activity.title,
        titleAr: activity.titleAr,
        description: activity.description,
        descriptionAr: activity.descriptionAr,
        gameType: activity.gameType,
        difficulty: activity.difficulty,
        status: activity.status,
        questions: activity.questions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          data: JSON.parse(q.data),
          explanation: q.explanation,
          orderIndex: q.orderIndex,
        })),
      },
    })
  } catch (err) {
    if (err instanceof AiError) {
      const teacherId = (await auth())?.user?.id
      if (teacherId) {
        await prisma.aiLog.create({
          data: {
            teacherId,
            type: 'remediation',
            status: err.type,
            errorMessage: err.message,
          },
        }).catch(() => {})
      }

      const statusMap: Record<string, number> = {
        timeout: 504,
        rate_limited: 429,
        invalid_response: 422,
        error: 500,
      }
      return NextResponse.json(
        { error: err.type, message: err.message },
        { status: statusMap[err.type] || 500 }
      )
    }

    console.error('AI remediate error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
