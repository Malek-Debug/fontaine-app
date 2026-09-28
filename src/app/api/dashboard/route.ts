import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [classes, studentCount, activityCount, recentSessions] =
      await Promise.all([
        prisma.class.findMany({
          where: { teacherId: session.user.id },
          include: {
            grade: true,
            _count: { select: { students: true } },
          },
        }),
        prisma.student.count({
          where: { class: { teacherId: session.user.id } },
        }),
        prisma.activity.count({
          where: { createdBy: session.user.id },
        }),
        prisma.gameSession.findMany({
          where: { teacherId: session.user.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { activity: true, class: true },
        }),
      ]);

    return NextResponse.json({
      teacherName: session.user.name || '',
      classes,
      totalStudents: studentCount,
      totalActivities: activityCount,
      recentSessions,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
