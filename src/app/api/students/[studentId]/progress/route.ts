import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { include: { teacher: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (student.class.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const skillResults = await prisma.studentResult.findMany({
      where: { studentId },
      include: { skill: true },
      orderBy: { lastAttemptAt: 'desc' },
    });

    const totalAttempts = skillResults.reduce((sum, r) => sum + r.totalAttempts, 0);
    const totalCorrect = skillResults.reduce((sum, r) => sum + r.correctCount, 0);
    const overallScore = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    const participations = await prisma.sessionParticipant.findMany({
      where: { studentId },
      include: {
        session: {
          include: {
            activity: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 10,
    });

    const recentAnswers = await Promise.all(
      participations.map(async (p) => {
        const answers = await prisma.studentAnswer.findMany({
          where: { sessionId: p.sessionId, studentId },
        });
        const correctCount = answers.filter((a) => a.isCorrect).length;
        const totalQuestions = answers.length;

        return {
          sessionId: p.sessionId,
          activityTitle: p.session.activity.titleAr || p.session.activity.title,
          gameType: p.session.activity.gameType,
          correctCount,
          totalQuestions,
          date: p.session.completedAt || p.session.createdAt,
        };
      })
    );

    const remediation = skillResults
      .filter((r) => r.masteryLevel === 'not_started' || r.masteryLevel === 'developing')
      .map((r) => ({
        skillId: r.skillId,
        skillNameAr: r.skill.nameAr || r.skill.name,
        masteryLevel: r.masteryLevel,
        totalAttempts: r.totalAttempts,
        correctCount: r.correctCount,
        accuracy: r.totalAttempts > 0 ? Math.round((r.correctCount / r.totalAttempts) * 100) : 0,
        suggestion: 'يحتاج المزيد من التمارين',
      }));

    const wrongAnswers = await prisma.studentAnswer.findMany({
      where: { studentId, isCorrect: false },
      include: {
        question: {
          include: {
            activity: true,
          },
        },
      },
    });

    const questionMissMap = new Map<
      string,
      {
        questionId: string;
        questionText: string;
        activityTitle: string;
        gameType: string;
        timesWrong: number;
      }
    >();

    for (const ans of wrongAnswers) {
      const existing = questionMissMap.get(ans.questionId);
      if (existing) {
        existing.timesWrong += 1;
      } else {
        questionMissMap.set(ans.questionId, {
          questionId: ans.questionId,
          questionText: ans.question.questionText,
          activityTitle: ans.question.activity.titleAr || ans.question.activity.title,
          gameType: ans.question.activity.gameType,
          timesWrong: 1,
        });
      }
    }

    const frequentlyMissedQuestions = Array.from(questionMissMap.values())
      .sort((a, b) => b.timesWrong - a.timesWrong)
      .slice(0, 5);

    return NextResponse.json({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        displayName: student.displayName,
        className: student.class.name,
      },
      overallScore,
      totalActivities: participations.length,
      skillResults: skillResults.map((r) => ({
        skillId: r.skillId,
        skillName: r.skill.name,
        skillNameAr: r.skill.nameAr,
        totalAttempts: r.totalAttempts,
        correctCount: r.correctCount,
        masteryLevel: r.masteryLevel,
      })),
      recentAnswers,
      remediation,
      frequentlyMissedQuestions,
    });
  } catch (error) {
    console.error('Failed to fetch student progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student progress' },
      { status: 500 }
    );
  }
}
