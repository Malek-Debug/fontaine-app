import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId } = await params;

    const original = await prisma.activity.findFirst({
      where: { id: activityId, createdBy: session.user.id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!original) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const duplicated = await prisma.$transaction(async (tx) => {
      const newActivity = await tx.activity.create({
        data: {
          title: `${original.title} (نسخة)`,
          titleAr: `${original.titleAr} (نسخة)`,
          description: original.description,
          descriptionAr: original.descriptionAr,
          gameType: original.gameType,
          difficulty: original.difficulty,
          timeLimit: original.timeLimit,
          skillId: original.skillId,
          createdBy: session.user.id,
          status: 'draft',
        },
      });

      if (original.questions.length > 0) {
        await tx.question.createMany({
          data: original.questions.map((q) => ({
            activityId: newActivity.id,
            orderIndex: q.orderIndex,
            questionText: q.questionText,
            questionType: q.questionType,
            data: q.data,
            explanation: q.explanation,
            points: q.points,
          })),
        });
      }

      return tx.activity.findUnique({
        where: { id: newActivity.id },
        include: {
          questions: { orderBy: { orderIndex: 'asc' } },
          skill: true,
          _count: { select: { questions: true } },
        },
      });
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    console.error('Failed to duplicate activity:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate activity' },
      { status: 500 }
    );
  }
}
