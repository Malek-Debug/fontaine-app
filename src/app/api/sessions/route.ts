import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createSessionSchema } from '@/lib/validators'
import { generateSessionCode } from '@/lib/code-generator'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await prisma.gameSession.findMany({
      where: { teacherId: session.user.id },
      include: {
        activity: true,
        class: true,
        teams: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createSessionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { activityId, classId, mode, showLeaderboard, teamCount, teamNames } = validation.data

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { questions: true },
    })
    if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    if (activity.questions.length === 0) return NextResponse.json({ error: 'Activity has no questions' }, { status: 400 })

    const cls = await prisma.class.findUnique({ where: { id: classId } })
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    if (cls.teacherId !== session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const existingCodes = await prisma.gameSession.findMany({
      where: { status: { in: ['waiting', 'active'] } },
      select: { code: true },
    })
    const code = await generateSessionCode(existingCodes.map((s) => s.code))

    const DEFAULT_TEAM_COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']
    const DEFAULT_TEAM_NAMES_AR = ['الفريق الأزرق', 'الفريق الأخضر', 'الفريق الأحمر', 'الفريق الأصفر', 'الفريق البنفسجي', 'الفريق الوردي', 'الفريق السماوي', 'الفريق البرتقالي']

    const gameSession = await prisma.gameSession.create({
      data: {
        code,
        activityId,
        classId,
        teacherId: session.user.id,
        status: 'waiting',
        mode,
        showLeaderboard,
        ...(mode === 'team' && {
          teams: {
            create: Array.from({ length: teamCount || 4 }, (_, i) => ({
              name: teamNames?.[i] || DEFAULT_TEAM_NAMES_AR[i],
              color: DEFAULT_TEAM_COLORS[i % DEFAULT_TEAM_COLORS.length],
              orderIndex: i,
            })),
          },
        }),
      },
      include: {
        activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
        class: { include: { students: true } },
        teams: { orderBy: { orderIndex: 'asc' } },
      },
    })

    return NextResponse.json(gameSession, { status: 201 })
  } catch (error) {
    console.error('Failed to create session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
