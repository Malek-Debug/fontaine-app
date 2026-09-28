import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeId = searchParams.get('gradeId');
    const subjectId = searchParams.get('subjectId');

    // Build dynamic where clause for grades
    const gradeWhere = gradeId ? { id: gradeId } : {};

    // Build dynamic where clause for subjects
    const subjectWhere = subjectId ? { id: subjectId } : {};

    const grades = await prisma.grade.findMany({
      where: gradeWhere,
      orderBy: { level: 'asc' },
      include: {
        subjects: {
          where: subjectWhere,
          include: {
            units: {
              orderBy: { orderIndex: 'asc' },
              include: {
                _count: { select: { domains: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(grades);
  } catch (error) {
    console.error('Failed to fetch curriculum:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curriculum' },
      { status: 500 }
    );
  }
}
