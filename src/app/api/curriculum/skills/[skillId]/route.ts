import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const { skillId } = await params;

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        lesson: { include: { domain: { include: { unit: true } } } },
        activities: {
          where: { status: 'published' },
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { questions: true } } },
        },
      },
    });

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Failed to fetch skill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}
