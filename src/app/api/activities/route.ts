import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createActivitySchema } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('skillId');
    const gameType = searchParams.get('gameType');
    const difficulty = searchParams.get('difficulty');

    // Build dynamic where clause
    const where: Record<string, unknown> = {
      createdBy: session.user.id,
    };

    if (skillId) where.skillId = skillId;
    if (gameType) where.gameType = gameType;
    if (difficulty) where.difficulty = difficulty;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        skill: {
          include: {
            lesson: {
              include: {
                domain: {
                  include: { unit: true },
                },
              },
            },
          },
        },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createActivitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { questions, ...activityData } = validation.data;

    // Verify the skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: activityData.skillId },
    });

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Create activity with questions in a transaction
    const activity = await prisma.$transaction(async (tx) => {
      const created = await tx.activity.create({
        data: {
          title: activityData.title,
          titleAr: activityData.titleAr,
          description: activityData.description,
          descriptionAr: activityData.descriptionAr,
          gameType: activityData.gameType,
          difficulty: activityData.difficulty,
          timeLimit: activityData.timeLimit,
          skillId: activityData.skillId,
          createdBy: session.user.id,
        },
      });

      // Create questions
      await tx.question.createMany({
        data: questions.map((q, index) => ({
          activityId: created.id,
          orderIndex: index,
          questionText: q.questionText,
          questionType: q.data.type,
          data: JSON.stringify(q.data),
          explanation: q.explanation || '',
          points: q.points || 10,
        })),
      });

      // Return with questions included
      return tx.activity.findUnique({
        where: { id: created.id },
        include: {
          questions: { orderBy: { orderIndex: 'asc' } },
          skill: true,
          _count: { select: { questions: true } },
        },
      });
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Failed to create activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
