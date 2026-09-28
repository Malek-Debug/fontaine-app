import { prisma } from '@/lib/db'

interface ScoreResult {
  isCorrect: boolean
  score: number
  correctAnswer: string
}

export async function validateAndScoreAnswer(
  sessionId: string,
  studentId: string,
  questionId: string,
  answerJson: string,
  timeSpent: number
): Promise<ScoreResult & { error?: string }> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      activity: true,
      participants: { where: { studentId } },
    },
  })

  if (!session) return { isCorrect: false, score: 0, correctAnswer: '', error: 'Session not found' }
  if (session.status !== 'active') return { isCorrect: false, score: 0, correctAnswer: '', error: 'Session is not active' }
  if (session.participants.length === 0) return { isCorrect: false, score: 0, correctAnswer: '', error: 'Student is not a participant' }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  })

  if (!question) return { isCorrect: false, score: 0, correctAnswer: '', error: 'Question not found' }
  if (question.activityId !== session.activityId) return { isCorrect: false, score: 0, correctAnswer: '', error: 'Question does not belong to this activity' }

  const existing = await prisma.studentAnswer.findUnique({
    where: {
      sessionId_studentId_questionId: { sessionId, studentId, questionId },
    },
  })

  if (existing) return { isCorrect: false, score: 0, correctAnswer: '', error: 'Already answered' }

  const result = scoreAnswer(question.questionType, question.data, answerJson)

  await prisma.$transaction([
    prisma.studentAnswer.create({
      data: {
        sessionId,
        studentId,
        questionId,
        answer: answerJson,
        isCorrect: result.isCorrect,
        score: result.score,
        timeSpent,
      },
    }),
    prisma.sessionParticipant.update({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
      data: {
        totalScore: { increment: result.score },
      },
    }),
  ])

  return result
}

function scoreAnswer(questionType: string, questionDataJson: string, answerJson: string): ScoreResult {
  try {
    const qData = JSON.parse(questionDataJson)
    const answer = JSON.parse(answerJson)

    switch (questionType) {
      case 'quiz':
        return scoreQuiz(qData, answer)
      case 'true_false':
        return scoreTrueFalse(qData, answer)
      case 'matching':
        return scoreMatching(qData, answer)
      case 'sentence_builder':
        return scoreSentenceBuilder(qData, answer)
      case 'order_story':
        return scoreOrderStory(qData, answer)
      case 'grammar_detective':
        return scoreGrammarDetective(qData, answer)
      case 'find_mistake':
        return scoreFindMistake(qData, answer)
      case 'vocabulary':
        return scoreVocabulary(qData, answer)
      default:
        return { isCorrect: false, score: 0, correctAnswer: '' }
    }
  } catch {
    return { isCorrect: false, score: 0, correctAnswer: '' }
  }
}

function scoreQuiz(qData: any, answer: any): ScoreResult {
  const isCorrect = answer.selectedOptionId === qData.correctOptionId
  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer: JSON.stringify({ correctOptionId: qData.correctOptionId }),
  }
}

function scoreTrueFalse(qData: any, answer: any): ScoreResult {
  const isCorrect = answer.selectedAnswer === qData.correctAnswer
  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer: JSON.stringify({ correctAnswer: qData.correctAnswer }),
  }
}

function scoreMatching(qData: any, answer: any): ScoreResult {
  const correctPairs: Record<string, string> = {}
  for (const pair of qData.pairs) {
    correctPairs[pair.id] = pair.right
  }

  const studentPairs: Record<string, string> = answer.pairs || {}
  let correctCount = 0
  const totalPairs = qData.pairs.length

  for (const [id, right] of Object.entries(studentPairs)) {
    if (correctPairs[id] === right) correctCount++
  }

  const isCorrect = correctCount === totalPairs
  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer: JSON.stringify({ pairs: correctPairs }),
  }
}

function scoreSentenceBuilder(qData: any, answer: any): ScoreResult {
  const correctOrder: string[] = qData.correctOrder
  const studentOrder: string[] = answer.orderedWords || []

  const isCorrect =
    correctOrder.length === studentOrder.length &&
    correctOrder.every((w, i) => w === studentOrder[i])

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer: JSON.stringify({ correctOrder }),
  }
}

function scoreOrderStory(qData: any, answer: any): ScoreResult {
  const correctOrder: string[] = qData.correctOrder
  const studentOrder: string[] = answer.orderedItemIds || []

  const isCorrect =
    correctOrder.length === studentOrder.length &&
    correctOrder.every((id, i) => id === studentOrder[i])

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer: JSON.stringify({ correctOrder }),
  }
}

function scoreGrammarDetective(qData: any, answer: any): ScoreResult {
  const correctLabels: Record<string, string> = {}
  for (const target of qData.targets) {
    correctLabels[target.id] = target.label
  }

  const studentLabels: Record<string, string> = answer.labelAssignments || {}
  let correctCount = 0
  const totalTargets = qData.targets.length

  for (const [id, label] of Object.entries(studentLabels)) {
    if (correctLabels[id] === label) correctCount++
  }

  const isCorrect = correctCount === totalTargets
  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer: JSON.stringify({ labels: correctLabels }),
  }
}

function scoreFindMistake(qData: any, answer: any): ScoreResult {
  const isCorrect =
    answer.selectedText === qData.mistakeText &&
    answer.correction === qData.correctionText

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer: JSON.stringify({
      mistakeText: qData.mistakeText,
      correctionText: qData.correctionText,
      correctedSentence: qData.correctedSentence,
    }),
  }
}

function scoreVocabulary(qData: any, answer: any): ScoreResult {
  let isCorrect = false

  if (qData.format === 'definition' || qData.format === 'image_match') {
    isCorrect = answer.selectedWord === qData.word
  } else if (qData.format === 'fill_blank') {
    isCorrect = answer.selectedWord === qData.word
  }

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer: JSON.stringify({ word: qData.word, definition: qData.definition }),
  }
}

export function getCorrectAnswerForType(questionType: string, questionDataJson: string): string {
  try {
    const qData = JSON.parse(questionDataJson)
    switch (questionType) {
      case 'quiz':
        return JSON.stringify({ correctOptionId: qData.correctOptionId })
      case 'true_false':
        return JSON.stringify({ correctAnswer: qData.correctAnswer })
      case 'matching':
        return JSON.stringify({ pairs: Object.fromEntries(qData.pairs.map((p: any) => [p.id, p.right])) })
      case 'sentence_builder':
        return JSON.stringify({ correctOrder: qData.correctOrder })
      case 'order_story':
        return JSON.stringify({ correctOrder: qData.correctOrder })
      case 'grammar_detective':
        return JSON.stringify({ labels: Object.fromEntries(qData.targets.map((t: any) => [t.id, t.label])) })
      case 'find_mistake':
        return JSON.stringify({ mistakeText: qData.mistakeText, correctionText: qData.correctionText, correctedSentence: qData.correctedSentence })
      case 'vocabulary':
        return JSON.stringify({ word: qData.word, definition: qData.definition })
      default:
        return ''
    }
  } catch {
    return ''
  }
}

export function stripCorrectAnswer(questionType: string, dataJson: string): string {
  try {
    const data = JSON.parse(dataJson)
    switch (questionType) {
      case 'quiz': {
        const { correctOptionId, ...safe } = data
        void correctOptionId
        return JSON.stringify(safe)
      }
      case 'true_false': {
        const { correctAnswer, ...safe } = data
        void correctAnswer
        return JSON.stringify(safe)
      }
      case 'matching': {
        const shuffledPairs = data.pairs.map((p: any) => ({
          id: p.id,
          left: p.left,
          right: p.right,
        }))
        const rights = shuffledPairs.map((p: any) => p.right)
        for (let i = rights.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[rights[i], rights[j]] = [rights[j], rights[i]]
        }
        return JSON.stringify({
          ...data,
          pairs: shuffledPairs.map((p: any) => ({ id: p.id, left: p.left })),
          shuffledRights: rights,
        })
      }
      case 'sentence_builder': {
        const { correctOrder, ...safe } = data
        void correctOrder
        const shuffled = [...data.words]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return JSON.stringify({ ...safe, words: shuffled })
      }
      case 'order_story': {
        const { correctOrder, ...safe } = data
        void correctOrder
        const shuffledItems = [...data.items]
        for (let i = shuffledItems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]]
        }
        return JSON.stringify({ ...safe, items: shuffledItems })
      }
      case 'grammar_detective': {
        const safeTargets = data.targets.map((t: any) => ({
          id: t.id,
          text: t.text,
          startIndex: t.startIndex,
          endIndex: t.endIndex,
        }))
        return JSON.stringify({
          ...data,
          targets: safeTargets,
        })
      }
      case 'find_mistake': {
        const { correctedSentence, correctionText, mistakeText, mistakeStartIndex, mistakeEndIndex, ...safe } = data
        void correctedSentence; void correctionText; void mistakeText; void mistakeStartIndex; void mistakeEndIndex
        return JSON.stringify(safe)
      }
      case 'vocabulary': {
        const allWords = [data.word, ...data.distractors]
        for (let i = allWords.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[allWords[i], allWords[j]] = [allWords[j], allWords[i]]
        }
        return JSON.stringify({
          type: data.type,
          definition: data.definition,
          imageUrl: data.imageUrl,
          format: data.format,
          contextSentence: data.contextSentence,
          choices: allWords,
        })
      }
      default:
        return dataJson
    }
  } catch {
    return dataJson
  }
}

export async function getQuestionStats(sessionId: string, questionId: string) {
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId, questionId },
  })

  const correctCount = answers.filter((a) => a.isCorrect).length
  const totalTime = answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0)

  return {
    totalAnswers: answers.length,
    correctCount,
    averageTime: answers.length > 0 ? Math.round(totalTime / answers.length) : 0,
  }
}

export async function getSessionResults(sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      participants: {
        include: { student: true },
        orderBy: { totalScore: 'desc' },
      },
    },
  })

  if (!session) return null

  const questionResults = await Promise.all(
    session.activity.questions.map(async (q) => {
      const stats = await getQuestionStats(sessionId, q.id)
      return {
        questionId: q.id,
        questionText: q.questionText,
        correctCount: stats.correctCount,
        totalAnswers: stats.totalAnswers,
      }
    })
  )

  const studentAnswers = await prisma.studentAnswer.findMany({
    where: { sessionId },
  })

  const leaderboard = session.participants.map((p) => ({
    studentId: p.studentId,
    displayName: p.student.displayName,
    totalScore: p.totalScore,
    correctCount: studentAnswers.filter(a => a.studentId === p.studentId && a.isCorrect).length,
    totalQuestions: session.activity.questions.length,
  }))

  return { sessionId, leaderboard, questionResults }
}

export async function updateStudentSkillResults(sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      activity: true,
      participants: true,
    },
  })

  if (!session) return

  const skillId = session.activity.skillId

  for (const participant of session.participants) {
    const answers = await prisma.studentAnswer.findMany({
      where: { sessionId, studentId: participant.studentId },
    })

    const correctCount = answers.filter((a) => a.isCorrect).length
    const totalAttempts = answers.length

    await prisma.studentResult.upsert({
      where: {
        studentId_skillId: {
          studentId: participant.studentId,
          skillId,
        },
      },
      create: {
        studentId: participant.studentId,
        skillId,
        totalAttempts,
        correctCount,
        masteryLevel: getMasteryLevel(correctCount, totalAttempts),
        lastAttemptAt: new Date(),
      },
      update: {
        totalAttempts: { increment: totalAttempts },
        correctCount: { increment: correctCount },
        lastAttemptAt: new Date(),
      },
    })

    const result = await prisma.studentResult.findUnique({
      where: {
        studentId_skillId: {
          studentId: participant.studentId,
          skillId,
        },
      },
    })

    if (result) {
      await prisma.studentResult.update({
        where: { id: result.id },
        data: {
          masteryLevel: getMasteryLevel(result.correctCount, result.totalAttempts),
        },
      })
    }
  }
}

function getMasteryLevel(correct: number, total: number): string {
  if (total === 0) return 'not_started'
  const ratio = correct / total
  if (ratio >= 0.9) return 'mastered'
  if (ratio >= 0.7) return 'proficient'
  if (ratio >= 0.4) return 'developing'
  return 'not_started'
}
