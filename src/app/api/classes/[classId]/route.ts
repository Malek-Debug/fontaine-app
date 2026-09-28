import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updateClassSchema } from '@/lib/validators';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await params;

    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
      include: {
        grade: true,
        students: { orderBy: { firstName: 'asc' } },
        _count: { select: { students: true, sessions: true } },
      },
    });

    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json(cls);
  } catch (error) {
    console.error('Failed to fetch class:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await params;
    const body = await request.json();
    const validation = updateClassSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Verify the teacher owns this class
    const existing = await prisma.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: validation.data,
      include: { grade: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update class:', error);
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await params;

    // Verify the teacher owns this class
    const existing = await prisma.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    await prisma.class.delete({ where: { id: classId } });

    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Failed to delete class:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}
