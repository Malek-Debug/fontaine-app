import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createClassSchema } from '@/lib/validators';
import { generateCode } from '@/lib/code-generator';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classes = await prisma.class.findMany({
      where: { teacherId: session.user.id },
      include: {
        grade: true,
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
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
    const validation = createClassSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, gradeId } = validation.data;

    // Verify the grade exists
    const grade = await prisma.grade.findUnique({ where: { id: gradeId } });
    if (!grade) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 });
    }

    // Generate unique join code
    let joinCode: string;
    let isUnique = false;
    while (!isUnique) {
      joinCode = generateCode(6);
      const existing = await prisma.class.findUnique({ where: { joinCode } });
      if (!existing) isUnique = true;
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        gradeId,
        joinCode: joinCode!,
        teacherId: session.user.id,
      },
      include: { grade: true },
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error('Failed to create class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
