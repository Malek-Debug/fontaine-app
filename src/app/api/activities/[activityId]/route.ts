import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updateActivitySchema } from '@/lib/validators';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId } = await params;

    const activity = await prisma.activity.findFirst({
      where: { id: activityId, createdBy: session.user.id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
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
        _count: { select: { questions: true, gameSessions: true } },
      },
    });

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId } = await params;
    const body = await request.json();
    const validation = updateActivitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Verify the teacher owns this activity
    const existing = await prisma.activity.findFirst({
      where: { id: activityId, createdBy: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: validation.data,
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        skill: true,
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update activity:', error);
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId } = await params;

    // Verify the teacher owns this activity
    const existing = await prisma.activity.findFirst({
      where: { id: activityId, createdBy: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    await prisma.activity.delete({ where: { id: activityId } });

    return NextResponse.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Failed to delete activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
