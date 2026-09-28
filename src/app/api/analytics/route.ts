import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classIdFilter = searchParams.get('classId');
    const subjectIdFilter = searchParams.get('subjectId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Record<string, unknown> = { teacherId: session.user.id };
    if (classIdFilter) where.id = classIdFilter;

    const classes = await prisma.class.findMany({
      where,
      include: {
        students: true,
        grade: { include: { subjects: true } },
        sessions: {
          where: {
            ...(dateFrom || dateTo
              ? {
                  createdAt: {
                    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                    ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
                  },
                }
              : {}),
          },
          include: {
            activity: { include: { skill: { include: { lesson: { include: { domain: { include: { unit: true } } } } } } } },
            participants: {
              include: { student: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const classAnalytics = await Promise.all(
      classes.map(async (cls) => {
        const studentIds = cls.students.map((s) => s.id);

        let filteredSessions = cls.sessions;
        if (subjectIdFilter) {
          filteredSessions = filteredSessions.filter((s) => {
            const unit = s.activity.skill.lesson.domain.unit;
            return unit.subjectId === subjectIdFilter;
          });
        }

        const studentResults = await prisma.studentResult.findMany({
          where: {
            studentId: { in: studentIds },
            ...(subjectIdFilter
              ? {
                  skill: {
                    lesson: {
                      domain: {
                        unit: { subjectId: subjectIdFilter },
                      },
                    },
                  },
                }
              : {}),
          },
          include: { skill: true, student: true },
        });

        const masteryDistribution = {
          not_started: 0,
          developing: 0,
          proficient: 0,
          mastered: 0,
        };

        for (const r of studentResults) {
          const level = r.masteryLevel as keyof typeof masteryDistribution;
          if (level in masteryDistribution) {
            masteryDistribution[level]++;
          }
        }

        const completedSessions = filteredSessions.filter((s) => s.status === 'completed');
        let totalScoreSum = 0;
        let totalParticipants = 0;

        for (const s of completedSessions) {
          for (const p of s.participants) {
            totalScoreSum += p.totalScore;
            totalParticipants++;
          }
        }

        const averageScore =
          totalParticipants > 0 ? Math.round(totalScoreSum / totalParticipants) : 0;

        const recentSessions = filteredSessions.slice(0, 5).map((s) => {
          const sessionParticipants = s.participants;
          const avgScore =
            sessionParticipants.length > 0
              ? Math.round(
                  sessionParticipants.reduce((sum, p) => sum + p.totalScore, 0) /
                    sessionParticipants.length
                )
              : 0;

          return {
            sessionId: s.id,
            activityTitle: s.activity.titleAr || s.activity.title,
            gameType: s.activity.gameType,
            date: s.createdAt,
            status: s.status,
            participantCount: sessionParticipants.length,
            averageScore: avgScore,
          };
        });

        const studentsNeedingSupport = studentResults
          .filter(
            (r) => r.masteryLevel === 'not_started' || r.masteryLevel === 'developing'
          )
          .reduce(
            (acc, r) => {
              const existing = acc.find((a) => a.studentId === r.studentId);
              if (existing) {
                existing.weakSkills.push(r.skill.nameAr || r.skill.name);
              } else {
                acc.push({
                  studentId: r.studentId,
                  displayName: r.student.displayName,
                  weakSkills: [r.skill.nameAr || r.skill.name],
                });
              }
              return acc;
            },
            [] as Array<{ studentId: string; displayName: string; weakSkills: string[] }>
          );

        const skillMap = new Map<
          string,
          {
            skillId: string;
            skillName: string;
            skillNameAr: string;
            category: string;
            totalAttempts: number;
            correctCount: number;
            studentCount: number;
          }
        >();

        for (const r of studentResults) {
          const existing = skillMap.get(r.skillId);
          if (existing) {
            existing.totalAttempts += r.totalAttempts;
            existing.correctCount += r.correctCount;
            existing.studentCount += 1;
          } else {
            skillMap.set(r.skillId, {
              skillId: r.skillId,
              skillName: r.skill.name,
              skillNameAr: r.skill.nameAr || r.skill.name,
              category: r.skill.category,
              totalAttempts: r.totalAttempts,
              correctCount: r.correctCount,
              studentCount: 1,
            });
          }
        }

        const skillPerformance = Array.from(skillMap.values())
          .map((s) => ({
            ...s,
            accuracy: s.totalAttempts > 0 ? Math.round((s.correctCount / s.totalAttempts) * 100) : 0,
          }))
          .sort((a, b) => a.accuracy - b.accuracy);

        const weakSkillIds = skillPerformance
          .filter((s) => s.accuracy < 60)
          .map((s) => s.skillId);

        const activityCounts = weakSkillIds.length > 0
          ? await prisma.activity.groupBy({
              by: ['skillId'],
              where: { skillId: { in: weakSkillIds }, status: 'published' },
              _count: { id: true },
            })
          : [];

        const activityCountMap = new Map(
          activityCounts.map((a) => [a.skillId, a._count.id])
        );

        const weakSkills = skillPerformance
          .filter((s) => s.accuracy < 60)
          .map((s) => ({
            ...s,
            existingActivityCount: activityCountMap.get(s.skillId) || 0,
          }));

        return {
          classId: cls.id,
          className: cls.name,
          gradeId: cls.gradeId,
          subjects: cls.grade.subjects.map((s) => ({
            id: s.id,
            name: s.name,
            nameAr: s.nameAr,
          })),
          totalStudents: cls.students.length,
          totalSessions: filteredSessions.length,
          averageScore,
          masteryDistribution,
          skillPerformance,
          weakSkills,
          recentSessions,
          studentsNeedingSupport,
        };
      })
    );

    return NextResponse.json({ classes: classAnalytics });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
