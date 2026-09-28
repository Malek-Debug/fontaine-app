import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string; studentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId, studentId } = await params;

    // Verify the teacher owns this class
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
    });

    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Verify the student belongs to this class
    const student = await prisma.student.findFirst({
      where: { id: studentId, classId },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found in this class' },
        { status: 404 }
      );
    }

    await prisma.student.delete({ where: { id: studentId } });

    return NextResponse.json({ message: 'Student removed successfully' });
  } catch (error) {
    console.error('Failed to remove student:', error);
    return NextResponse.json(
      { error: 'Failed to remove student' },
      { status: 500 }
    );
  }
}
