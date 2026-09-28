import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const addStudentSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be at most 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be at most 50 characters'),
  displayName: z
    .string()
    .max(50, 'Display name must be at most 50 characters')
    .optional(),
});

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

    // Verify the teacher owns this class
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
    });

    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const students = await prisma.student.findMany({
      where: { classId },
      orderBy: { firstName: 'asc' },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Failed to fetch students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
    });

    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = addStudentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, lastName, displayName } = validation.data;

    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        displayName: displayName || firstName,
        classId,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Failed to add student:', error);
    return NextResponse.json(
      { error: 'Failed to add student' },
      { status: 500 }
    );
  }
}
