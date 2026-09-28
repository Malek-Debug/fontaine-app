import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCorrectAnswerForType } from '@/lib/socket/scoring'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const { questionId, answer } = body

    if (!questionId || !answer) {
      return NextResponse.json({ error: 'questionId and answer are required' }, { status: 400 })
    }

    const gameSession = await prisma.gameSession.findFirst({
      where: { id: sessionId, teacherId: session.user.id, mode: 'teacher_led' },
    })
    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found or not in teacher-led mode' }, { status: 404 })
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } })
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const correctAnswer = getCorrectAnswerForType(question.questionType, question.data)
    const isCorrect = checkAnswer(question.questionType, answer, correctAnswer, question.data)

    const classResponse = await prisma.classResponse.upsert({
      where: { sessionId_questionId: { sessionId, questionId } },
      create: {
        sessionId,
        questionId,
        answer,
        isCorrect,
        score: isCorrect ? question.points : 0,
      },
      update: {
        answer,
        isCorrect,
        score: isCorrect ? question.points : 0,
      },
    })

    return NextResponse.json({
      classResponse,
      correctAnswer,
      isCorrect,
    })
  } catch (error) {
    console.error('Failed to submit class answer:', error)
    return NextResponse.json({ error: 'Failed to submit class answer' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    const responses = await prisma.classResponse.findMany({
      where: { sessionId },
      include: { question: true },
      orderBy: { answeredAt: 'asc' },
    })

    const totalCorrect = responses.filter((r) => r.isCorrect).length
    const totalScore = responses.reduce((sum, r) => sum + r.score, 0)

    return NextResponse.json({
      responses,
      summary: {
        totalQuestions: responses.length,
        correctCount: totalCorrect,
        totalScore,
        accuracy: responses.length > 0 ? Math.round((totalCorrect / responses.length) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('Failed to fetch class answers:', error)
    return NextResponse.json({ error: 'Failed to fetch class answers' }, { status: 500 })
  }
}

function checkAnswer(questionType: string, answer: string, correctAnswer: string, questionData: string): boolean {
  try {
    const submitted = JSON.parse(answer)
    const correct = JSON.parse(correctAnswer)
    const data = JSON.parse(questionData)

    switch (questionType) {
      case 'quiz':
        return submitted.selectedOptionId === data.correctOptionId
      case 'true_false':
        return submitted.selectedAnswer === data.correctAnswer
      case 'vocabulary':
        return submitted.selectedWord === data.word
      case 'matching': {
        const pairs = data.pairs || []
        const submittedPairs = submitted.pairs || {}
        return pairs.every((p: { id: string; right: string }) => submittedPairs[p.id] === p.right)
      }
      case 'sentence_builder': {
        const correctOrder = data.correctOrder || []
        const submittedOrder = submitted.orderedWords || []
        return JSON.stringify(submittedOrder) === JSON.stringify(correctOrder)
      }
      case 'order_story': {
        const correctOrder = data.correctOrder || []
        const submittedOrder = submitted.orderedItemIds || []
        return JSON.stringify(submittedOrder) === JSON.stringify(correctOrder)
      }
      case 'grammar_detective': {
        const targets = data.targets || []
        const assignments = submitted.labelAssignments || {}
        return targets.every((t: { id: string; label: string }) => assignments[t.id] === t.label)
      }
      case 'find_mistake':
        return submitted.selectedText === data.mistakeText && submitted.correction === data.correctionText
      default:
        return JSON.stringify(submitted) === JSON.stringify(correct)
    }
  } catch {
    return false
  }
}
