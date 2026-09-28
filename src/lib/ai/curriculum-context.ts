import { prisma } from '@/lib/db'
import { AiError, type CurriculumContext } from './types'

export async function getCurriculumContextForSkill(
  skillId: string
): Promise<CurriculumContext> {
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    include: {
      lesson: {
        include: {
          domain: {
            include: {
              unit: {
                include: {
                  subject: {
                    include: {
                      grade: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!skill) {
    throw new AiError('error', `Skill not found: ${skillId}`)
  }

  const lesson = skill.lesson
  const domain = lesson.domain
  const unit = domain.unit
  const subject = unit.subject
  const grade = subject.grade

  return {
    grade: { id: grade.id, name: grade.name, nameAr: grade.nameAr, level: grade.level },
    subject: { id: subject.id, name: subject.name, nameAr: subject.nameAr },
    unit: { id: unit.id, name: unit.name, nameAr: unit.nameAr },
    domain: { id: domain.id, name: domain.name, nameAr: domain.nameAr },
    lesson: { id: lesson.id, name: lesson.name, nameAr: lesson.nameAr },
    skill: {
      id: skill.id,
      name: skill.name,
      nameAr: skill.nameAr,
      category: skill.category,
      descriptionAr: skill.descriptionAr,
    },
  }
}

export function formatCurriculumContext(ctx: CurriculumContext): string {
  return [
    `المستوى: ${ctx.grade.nameAr}`,
    `المادة: ${ctx.subject.nameAr}`,
    `المحور: ${ctx.unit.nameAr}`,
    `المجال: ${ctx.domain.nameAr}`,
    `الدرس: ${ctx.lesson.nameAr}`,
    `المهارة: ${ctx.skill.nameAr}`,
    ctx.skill.descriptionAr ? `وصف المهارة: ${ctx.skill.descriptionAr}` : '',
    `صنف المهارة: ${ctx.skill.category}`,
  ]
    .filter(Boolean)
    .join('\n')
}
