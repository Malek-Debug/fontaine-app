import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getCurriculumContextForSkill,
  buildChatSystemPrompt,
  chatAi,
  isAiAvailable,
  initializeAiProvider,
  AiError,
} from '@/lib/ai'

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })).min(1),
  classId: z.string().optional(),
  skillId: z.string().optional(),
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
    const parsed = chatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', message: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { messages, classId, skillId } = parsed.data
    const teacherId = session.user.id

    let ctx = undefined
    if (skillId) {
      ctx = await getCurriculumContextForSkill(skillId)
    }

    let classData = undefined
    if (classId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          students: true,
          sessions: {
            where: { status: 'completed' },
            include: { participants: true },
          },
        },
      })

      if (!cls || cls.teacherId !== teacherId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      let totalScore = 0
      let totalParticipants = 0
      for (const s of cls.sessions) {
        for (const p of s.participants) {
          totalScore += p.totalScore
          totalParticipants++
        }
      }

      classData = {
        className: cls.name,
        studentCount: cls.students.length,
        averageScore: totalParticipants > 0 ? Math.round(totalScore / totalParticipants) : 0,
      }
    }

    const systemPrompt = buildChatSystemPrompt(ctx, classData)
    const result = await chatAi(
      messages.map(m => ({ role: m.role, content: m.content })),
      { system: systemPrompt, maxTokens: 2048 }
    )

    await prisma.aiLog.create({
      data: {
        teacherId,
        type: 'chat',
        skillId: skillId || null,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        status: 'success',
        resultSummary: result.content.substring(0, 200),
      },
    }).catch(() => {})

    return NextResponse.json({
      message: { role: 'assistant' as const, content: result.content },
    })
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

    console.error('AI chat error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
