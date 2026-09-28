import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const session = await prisma.gameSession.findUnique({
      where: { code },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            gameType: true,
            timeLimit: true,
            _count: { select: { questions: true } },
          },
        },
        class: {
          include: {
            students: {
              select: { id: true, firstName: true, lastName: true, displayName: true },
              orderBy: { firstName: 'asc' },
            },
          },
        },
        participants: {
          include: {
            student: {
              select: { id: true, displayName: true },
            },
          },
        },
        teams: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, name: true, color: true, orderIndex: true },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Failed to fetch session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
