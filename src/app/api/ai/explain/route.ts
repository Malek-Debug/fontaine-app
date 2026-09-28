import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getCurriculumContextForSkill,
  buildSkillExplanationPrompt,
  chatAi,
  isAiAvailable,
  initializeAiProvider,
  AiError,
} from '@/lib/ai'

const explainRequestSchema = z.object({
  skillId: z.string().min(1),
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
    const parsed = explainRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', message: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { skillId, studentId, classId } = parsed.data
    const teacherId = session.user.id

    if (classId) {
      const cls = await prisma.class.findUnique({ where: { id: classId } })
      if (!cls || cls.teacherId !== teacherId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const ctx = await getCurriculumContextForSkill(skillId)

    const answerWhere: Record<string, unknown> = {
      question: { activity: { skillId } },
    }
    if (studentId) {
      answerWhere.studentId = studentId
    } else if (classId) {
      const studentIds = (await prisma.student.findMany({
        where: { classId },
        select: { id: true },
      })).map(s => s.id)
      answerWhere.studentId = { in: studentIds }
    }

    const answers = await prisma.studentAnswer.findMany({
      where: answerWhere,
      include: {
        question: {
          include: { activity: true },
        },
      },
      orderBy: { answeredAt: 'desc' },
      take: 20,
    })

    if (answers.length === 0) {
      return NextResponse.json({
        explanation: 'لا توجد بيانات كافية للتحليل',
      })
    }

    const mistakeData = answers.map(a => {
      let correctAnswer = ''
      try {
        const data = JSON.parse(a.question.data)
        if (data.type === 'quiz') {
          const correct = data.options?.find((o: { id: string; text: string }) => o.id === data.correctOptionId)
          correctAnswer = correct?.text || data.correctOptionId
        } else if (data.type === 'true_false') {
          correctAnswer = data.correctAnswer ? 'صحيح' : 'خطأ'
        } else if (data.type === 'find_mistake') {
          correctAnswer = data.correctionText
        } else if (data.type === 'vocabulary') {
          correctAnswer = data.definition
        } else {
          correctAnswer = JSON.stringify(data.correctOrder || data.pairs || data.targets || '')
        }
      } catch {
        correctAnswer = 'غير متاح'
      }

      let studentAnswer = ''
      try {
        const ans = JSON.parse(a.answer)
        if (typeof ans === 'string') {
          studentAnswer = ans
        } else if (ans.selectedOptionId) {
          studentAnswer = ans.selectedOptionId
        } else if (ans.answer !== undefined) {
          studentAnswer = String(ans.answer)
        } else {
          studentAnswer = JSON.stringify(ans)
        }
      } catch {
        studentAnswer = a.answer
      }

      return {
        questionText: a.question.questionText,
        studentAnswer,
        correctAnswer,
        isCorrect: a.isCorrect,
      }
    })

    const prompt = buildSkillExplanationPrompt(ctx, mistakeData)
    const result = await chatAi(
      [{ role: 'user' as const, content: prompt.user }],
      { system: prompt.system, temperature: 0.3 },
    )

    await prisma.aiLog.create({
      data: {
        teacherId,
        type: 'explanation',
        skillId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        status: 'success',
        resultSummary: result.content.substring(0, 200),
      },
    }).catch(() => {})

    return NextResponse.json({ explanation: result.content })
  } catch (err) {
    if (err instanceof AiError) {
      const statusMap: Record<string, number> = {
        timeout: 504,
        rate_limited: 429,
        error: 500,
      }
      return NextResponse.json(
        { error: err.type, message: err.message },
        { status: statusMap[err.type] || 500 }
      )
    }

    console.error('AI explain error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
