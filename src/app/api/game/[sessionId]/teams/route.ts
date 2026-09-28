import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    const gameSession = await prisma.gameSession.findFirst({
      where: { id: sessionId, teacherId: session.user.id },
    })
    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const teams = await prisma.team.findMany({
      where: { sessionId },
      include: {
        members: {
          include: { student: { select: { id: true, displayName: true } } },
        },
      },
      orderBy: { orderIndex: 'asc' },
    })

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Failed to fetch teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const { name, color } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const gameSession = await prisma.gameSession.findFirst({
      where: { id: sessionId, teacherId: session.user.id, mode: 'team' },
    })
    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found or not in team mode' }, { status: 404 })
    }

    const teamCount = await prisma.team.count({ where: { sessionId } })
    if (teamCount >= 8) {
      return NextResponse.json({ error: 'Maximum 8 teams allowed' }, { status: 400 })
    }

    const team = await prisma.team.create({
      data: {
        sessionId,
        name,
        color: color || '#3B82F6',
        orderIndex: teamCount,
      },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Failed to create team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const { teamId, name, color } = body

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const gameSession = await prisma.gameSession.findFirst({
      where: { id: sessionId, teacherId: session.user.id },
    })
    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
    })

    return NextResponse.json(team)
  } catch (error) {
    console.error('Failed to update team:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const gameSession = await prisma.gameSession.findFirst({
      where: { id: sessionId, teacherId: session.user.id },
    })
    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    await prisma.sessionParticipant.updateMany({
      where: { teamId },
      data: { teamId: null },
    })

    await prisma.team.delete({ where: { id: teamId } })

    return NextResponse.json({ message: 'Team deleted' })
  } catch (error) {
    console.error('Failed to delete team:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}
