import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, teacherId: authSession.user.id },
      include: {
        activity: {
          include: {
            questions: { orderBy: { orderIndex: 'asc' } },
            skill: true,
          },
        },
        class: true,
        participants: {
          include: { student: true, team: true },
          orderBy: { totalScore: 'desc' },
        },
        teams: { orderBy: { score: 'desc' } },
        classResponses: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.mode === 'teacher_led') {
      const totalCorrect = session.classResponses.filter((r) => r.isCorrect).length;
      const totalScore = session.classResponses.reduce((sum, r) => sum + r.score, 0);
      const totalQuestions = session.activity.questions.length;

      return NextResponse.json({
        mode: session.mode,
        session: {
          id: session.id,
          code: session.code,
          status: session.status,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
        },
        activity: {
          title: session.activity.title,
          titleAr: session.activity.titleAr,
          gameType: session.activity.gameType,
          difficulty: session.activity.difficulty,
          skillNameAr: session.activity.skill?.nameAr || '',
        },
        className: session.class.name,
        classResults: {
          totalQuestions,
          correctCount: totalCorrect,
          totalScore,
          accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        },
        questionResults: session.activity.questions.map((q) => {
          const response = session.classResponses.find((r) => r.questionId === q.id);
          return {
            questionId: q.id,
            questionText: q.questionText,
            correctCount: response?.isCorrect ? 1 : 0,
            totalAnswers: response ? 1 : 0,
            accuracy: response ? (response.isCorrect ? 1 : 0) : 0,
          };
        }),
      });
    }

    const allAnswers = await prisma.studentAnswer.findMany({
      where: { sessionId },
    });

    const totalQuestions = session.activity.questions.length;
    const totalParticipants = session.participants.length;

    const leaderboard = session.participants.map((p) => {
      const studentAnswers = allAnswers.filter((a) => a.studentId === p.studentId);
      const correctCount = studentAnswers.filter((a) => a.isCorrect).length;
      return {
        studentId: p.studentId,
        displayName: p.student.displayName,
        totalScore: p.totalScore,
        correctCount,
        totalQuestions,
        answeredCount: studentAnswers.length,
      };
    });

    const classAverage =
      totalParticipants > 0 && totalQuestions > 0
        ? leaderboard.reduce((sum, l) => sum + l.correctCount / totalQuestions, 0) /
          totalParticipants
        : 0;

    const participantsWhoAnswered = new Set(allAnswers.map((a) => a.studentId)).size;
    const participationRate =
      totalParticipants > 0 ? participantsWhoAnswered / totalParticipants : 0;

    const questionResults = session.activity.questions.map((q) => {
      const qAnswers = allAnswers.filter((a) => a.questionId === q.id);
      const correctCount = qAnswers.filter((a) => a.isCorrect).length;
      return {
        questionId: q.id,
        questionText: q.questionText,
        correctCount,
        totalAnswers: qAnswers.length,
        accuracy: qAnswers.length > 0 ? correctCount / qAnswers.length : 0,
      };
    });

    const lowPerformers = leaderboard
      .filter((l) => totalQuestions > 0 && l.correctCount / totalQuestions < 0.6)
      .map((l) => ({
        studentId: l.studentId,
        displayName: l.displayName,
        score: totalQuestions > 0 ? Math.round((l.correctCount / totalQuestions) * 100) : 0,
        suggestion: 'يحتاج المزيد من التمارين',
      }));

    const teamLeaderboard = session.mode === 'team' && session.teams.length > 0
      ? session.teams.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          teamColor: t.color,
          totalScore: t.score,
          memberCount: session.participants.filter((p) => p.teamId === t.id).length,
        }))
      : undefined;

    return NextResponse.json({
      mode: session.mode,
      session: {
        id: session.id,
        code: session.code,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
      activity: {
        title: session.activity.title,
        titleAr: session.activity.titleAr,
        gameType: session.activity.gameType,
        difficulty: session.activity.difficulty,
        skillNameAr: session.activity.skill?.nameAr || '',
      },
      className: session.class.name,
      classAverage: Math.round(classAverage * 100),
      participationRate: Math.round(participationRate * 100),
      totalQuestions,
      leaderboard,
      teamLeaderboard,
      questionResults,
      lowPerformers,
    });
  } catch (error) {
    console.error('Failed to fetch session results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session results' },
      { status: 500 }
    );
  }
}
