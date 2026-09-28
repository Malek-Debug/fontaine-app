import type { Server, Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from './events'
import { prisma } from '@/lib/db'
import {
  validateAndScoreAnswer,
  getQuestionStats,
  getSessionResults,
  updateStudentSkillResults,
  getCorrectAnswerForType,
  stripCorrectAnswer,
} from './scoring'

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>

const socketToStudent = new Map<string, { studentId: string; sessionId: string }>()
const socketToTeacher = new Map<string, string>()

function sessionRoom(sessionId: string) {
  return `session:${sessionId}`
}

function teacherRoom(sessionId: string) {
  return `teacher:${sessionId}`
}

export function registerSocketHandlers(io: TypedServer) {
  io.on('connection', (socket: TypedSocket) => {
    socket.on('student:join', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { code: data.gameCode },
          include: {
            participants: { include: { student: true } },
            activity: { include: { questions: true } },
            teams: { orderBy: { orderIndex: 'asc' } },
          },
        })

        if (!session) return callback({ ok: false, error: 'Invalid game code' })
        if (session.status === 'completed') return callback({ ok: false, error: 'Session has ended' })

        const student = await prisma.student.findUnique({ where: { id: data.studentId } })
        if (!student) return callback({ ok: false, error: 'Student not found' })

        let teamId: string | undefined | null = data.teamId
        if (session.mode === 'team' && teamId) {
          const team = session.teams.find((t) => t.id === teamId)
          if (!team) return callback({ ok: false, error: 'Invalid team' })
        }
        if (session.mode !== 'team') teamId = null

        await prisma.sessionParticipant.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: data.studentId } },
          create: { sessionId: session.id, studentId: data.studentId, isConnected: true, teamId: teamId || null },
          update: { isConnected: true, ...(teamId ? { teamId } : {}) },
        })

        socketToStudent.set(socket.id, { studentId: data.studentId, sessionId: session.id })
        socket.join(sessionRoom(session.id))

        io.to(teacherRoom(session.id)).emit('session:student-joined', {
          studentId: data.studentId,
          displayName: student.displayName,
        })

        await emitSessionState(io, session.id)
        callback({ ok: true })
      } catch (err) {
        console.error('student:join error:', err)
        callback({ ok: false, error: 'Failed to join session' })
      }
    })

    socket.on('student:select-team', async (data, callback) => {
      try {
        const studentInfo = socketToStudent.get(socket.id)
        if (!studentInfo) return callback({ ok: false, error: 'Not in a session' })

        const existing = await prisma.sessionParticipant.findUnique({
          where: { sessionId_studentId: { sessionId: studentInfo.sessionId, studentId: studentInfo.studentId } },
        })
        if (!existing) return callback({ ok: false, error: 'Not a participant' })

        const team = await prisma.team.findUnique({ where: { id: data.teamId } })
        if (!team || team.sessionId !== studentInfo.sessionId) {
          return callback({ ok: false, error: 'Invalid team' })
        }

        await prisma.sessionParticipant.update({
          where: { id: existing.id },
          data: { teamId: data.teamId },
        })

        await emitSessionState(io, studentInfo.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('student:select-team error:', err)
        callback({ ok: false, error: 'Failed to select team' })
      }
    })

    socket.on('teacher:join', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({ where: { id: data.sessionId } })
        if (!session) return callback({ ok: false, error: 'Session not found' })

        socketToTeacher.set(socket.id, data.sessionId)
        socket.join(sessionRoom(data.sessionId))
        socket.join(teacherRoom(data.sessionId))

        await emitSessionState(io, data.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('teacher:join error:', err)
        callback({ ok: false, error: 'Failed to join as teacher' })
      }
    })

    socket.on('teacher:start-session', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { id: data.sessionId },
          include: { activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
        })

        if (!session) return callback({ ok: false, error: 'Session not found' })
        if (session.status !== 'waiting') return callback({ ok: false, error: 'Session already started' })

        if (session.mode !== 'teacher_led') {
          const participants = await prisma.sessionParticipant.count({
            where: { sessionId: data.sessionId, isConnected: true },
          })
          if (participants === 0) return callback({ ok: false, error: 'No students connected' })
        }

        await prisma.gameSession.update({
          where: { id: data.sessionId },
          data: { status: 'active', startedAt: new Date(), currentQuestionIndex: 0 },
        })

        const firstQuestion = session.activity.questions[0]
        if (!firstQuestion) return callback({ ok: false, error: 'No questions in activity' })

        emitQuestionToStudents(io, data.sessionId, firstQuestion, 0, session.activity.questions.length, session.activity.timeLimit)
        await emitSessionState(io, data.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('teacher:start-session error:', err)
        callback({ ok: false, error: 'Failed to start session' })
      }
    })

    socket.on('teacher:next-question', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { id: data.sessionId },
          include: { activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
        })

        if (!session) return callback({ ok: false, error: 'Session not found' })
        if (session.status !== 'active') return callback({ ok: false, error: 'Session is not active' })

        const currentQ = session.activity.questions[session.currentQuestionIndex]
        if (currentQ) {
          const correctAnswer = getCorrectAnswerForType(currentQ.questionType, currentQ.data)
          const stats = await getQuestionStats(data.sessionId, currentQ.id)
          io.to(sessionRoom(data.sessionId)).emit('question:ended', {
            questionId: currentQ.id,
            correctAnswer,
            stats,
          })
        }

        const nextIndex = session.currentQuestionIndex + 1
        if (nextIndex >= session.activity.questions.length) {
          await prisma.gameSession.update({
            where: { id: data.sessionId },
            data: { status: 'completed', completedAt: new Date(), currentQuestionIndex: nextIndex },
          })

          if (session.mode !== 'teacher_led') {
            await updateStudentSkillResults(data.sessionId)
          }
          const results = await getSessionResultsWithMode(data.sessionId, session.mode)
          if (results) {
            io.to(sessionRoom(data.sessionId)).emit('session:results', results)
          }
          await emitSessionState(io, data.sessionId)
          return callback({ ok: true })
        }

        await prisma.gameSession.update({
          where: { id: data.sessionId },
          data: { currentQuestionIndex: nextIndex },
        })

        const nextQuestion = session.activity.questions[nextIndex]
        emitQuestionToStudents(io, data.sessionId, nextQuestion, nextIndex, session.activity.questions.length, session.activity.timeLimit)
        await emitSessionState(io, data.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('teacher:next-question error:', err)
        callback({ ok: false, error: 'Failed to advance question' })
      }
    })

    socket.on('teacher:prev-question', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { id: data.sessionId },
          include: { activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
        })

        if (!session) return callback({ ok: false, error: 'Session not found' })
        if (session.status !== 'active') return callback({ ok: false, error: 'Session is not active' })

        const prevIndex = session.currentQuestionIndex - 1
        if (prevIndex < 0) return callback({ ok: false, error: 'Already at first question' })

        await prisma.gameSession.update({
          where: { id: data.sessionId },
          data: { currentQuestionIndex: prevIndex },
        })

        const prevQuestion = session.activity.questions[prevIndex]
        emitQuestionToStudents(io, data.sessionId, prevQuestion, prevIndex, session.activity.questions.length, session.activity.timeLimit)
        await emitSessionState(io, data.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('teacher:prev-question error:', err)
        callback({ ok: false, error: 'Failed to go to previous question' })
      }
    })

    socket.on('teacher:pause-session', async (data, callback) => {
      try {
        await prisma.gameSession.update({
          where: { id: data.sessionId },
          data: { status: 'paused' },
        })
        await emitSessionState(io, data.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('teacher:pause-session error:', err)
        callback({ ok: false, error: 'Failed to pause session' })
      }
    })

    socket.on('teacher:resume-session', async (data, callback) => {
      try {
        await prisma.gameSession.update({
          where: { id: data.sessionId },
          data: { status: 'active' },
        })
        await emitSessionState(io, data.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('teacher:resume-session error:', err)
        callback({ ok: false, error: 'Failed to resume session' })
      }
    })

    socket.on('teacher:reveal-answer', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { id: data.sessionId },
          include: { activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
        })

        if (!session) return callback({ ok: false, error: 'Session not found' })

        const currentQ = session.activity.questions[session.currentQuestionIndex]
        if (!currentQ) return callback({ ok: false, error: 'No current question' })

        const correctAnswer = getCorrectAnswerForType(currentQ.questionType, currentQ.data)
        const stats = await getQuestionStats(data.sessionId, currentQ.id)

        io.to(sessionRoom(data.sessionId)).emit('question:ended', {
          questionId: currentQ.id,
          correctAnswer,
          stats,
        })

        callback({ ok: true })
      } catch (err) {
        console.error('teacher:reveal-answer error:', err)
        callback({ ok: false, error: 'Failed to reveal answer' })
      }
    })

    socket.on('teacher:class-answer', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { id: data.sessionId },
          include: { activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
        })

        if (!session || session.mode !== 'teacher_led') {
          return callback({ ok: false, error: 'Not a teacher-led session' })
        }

        const question = session.activity.questions.find((q) => q.id === data.questionId)
        if (!question) return callback({ ok: false, error: 'Question not found' })

        const correctAnswerJson = getCorrectAnswerForType(question.questionType, question.data)
        const parsedData = JSON.parse(question.data)
        const parsedAnswer = JSON.parse(data.answer)
        const isCorrect = checkClassAnswer(question.questionType, parsedAnswer, parsedData)

        await prisma.classResponse.upsert({
          where: { sessionId_questionId: { sessionId: data.sessionId, questionId: data.questionId } },
          create: {
            sessionId: data.sessionId,
            questionId: data.questionId,
            answer: data.answer,
            isCorrect,
            score: isCorrect ? question.points : 0,
          },
          update: {
            answer: data.answer,
            isCorrect,
            score: isCorrect ? question.points : 0,
          },
        })

        const totalScore = await prisma.classResponse.aggregate({
          where: { sessionId: data.sessionId },
          _sum: { score: true },
        })

        io.to(sessionRoom(data.sessionId)).emit('class:answer-result', {
          questionId: data.questionId,
          answer: data.answer,
          isCorrect,
          correctAnswer: correctAnswerJson,
          classScore: totalScore._sum.score || 0,
        })

        callback({ ok: true, isCorrect })
      } catch (err) {
        console.error('teacher:class-answer error:', err)
        callback({ ok: false, error: 'Failed to submit class answer' })
      }
    })

    socket.on('teacher:award-point', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { id: data.sessionId },
          include: { activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
        })
        if (!session || session.mode !== 'teacher_led') {
          return callback({ ok: false, error: 'Not a teacher-led session' })
        }

        const currentQ = session.activity.questions[session.currentQuestionIndex]
        if (!currentQ) return callback({ ok: false, error: 'No current question' })

        await prisma.classResponse.upsert({
          where: { sessionId_questionId: { sessionId: data.sessionId, questionId: currentQ.id } },
          create: { sessionId: data.sessionId, questionId: currentQ.id, answer: '{}', isCorrect: true, score: currentQ.points },
          update: { isCorrect: true, score: currentQ.points },
        })

        await emitSessionState(io, data.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('teacher:award-point error:', err)
        callback({ ok: false, error: 'Failed to award point' })
      }
    })

    socket.on('teacher:remove-point', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { id: data.sessionId },
          include: { activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
        })
        if (!session || session.mode !== 'teacher_led') {
          return callback({ ok: false, error: 'Not a teacher-led session' })
        }

        const currentQ = session.activity.questions[session.currentQuestionIndex]
        if (!currentQ) return callback({ ok: false, error: 'No current question' })

        await prisma.classResponse.upsert({
          where: { sessionId_questionId: { sessionId: data.sessionId, questionId: currentQ.id } },
          create: { sessionId: data.sessionId, questionId: currentQ.id, answer: '{}', isCorrect: false, score: 0 },
          update: { isCorrect: false, score: 0 },
        })

        await emitSessionState(io, data.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('teacher:remove-point error:', err)
        callback({ ok: false, error: 'Failed to remove point' })
      }
    })

    socket.on('teacher:end-session', async (data, callback) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { id: data.sessionId },
        })

        await prisma.gameSession.update({
          where: { id: data.sessionId },
          data: { status: 'completed', completedAt: new Date() },
        })

        if (session?.mode !== 'teacher_led') {
          await updateStudentSkillResults(data.sessionId)
        }

        if (session?.mode === 'team') {
          await updateTeamScores(data.sessionId)
        }

        const results = await getSessionResultsWithMode(data.sessionId, session?.mode || 'individual')
        if (results) {
          io.to(sessionRoom(data.sessionId)).emit('session:results', results)
        }
        await emitSessionState(io, data.sessionId)
        callback({ ok: true })
      } catch (err) {
        console.error('teacher:end-session error:', err)
        callback({ ok: false, error: 'Failed to end session' })
      }
    })

    socket.on('answer:submit', async (data, callback) => {
      try {
        const result = await validateAndScoreAnswer(
          data.sessionId,
          data.studentId,
          data.questionId,
          data.answer,
          data.timeSpent
        )

        if (result.error) return callback({ ok: false, error: result.error })

        socket.emit('answer:result', {
          questionId: data.questionId,
          isCorrect: result.isCorrect,
          score: result.score,
          timeSpent: data.timeSpent,
        })

        const student = await prisma.student.findUnique({ where: { id: data.studentId } })
        io.to(teacherRoom(data.sessionId)).emit('answer:received', {
          studentId: data.studentId,
          displayName: student?.displayName || '',
          questionId: data.questionId,
          answeredAt: Date.now(),
        })

        const session = await prisma.gameSession.findUnique({
          where: { id: data.sessionId },
          include: { teams: true },
        })
        if (session?.mode === 'team') {
          await updateTeamScores(data.sessionId)
        }

        await emitSessionState(io, data.sessionId)

        callback({ ok: true })
      } catch (err) {
        console.error('answer:submit error:', err)
        callback({ ok: false, error: 'Failed to submit answer' })
      }
    })

    socket.on('disconnect', async () => {
      const studentInfo = socketToStudent.get(socket.id)
      if (studentInfo) {
        await prisma.sessionParticipant.updateMany({
          where: { sessionId: studentInfo.sessionId, studentId: studentInfo.studentId },
          data: { isConnected: false },
        })
        io.to(sessionRoom(studentInfo.sessionId)).emit('session:student-left', {
          studentId: studentInfo.studentId,
        })
        socketToStudent.delete(socket.id)
      }

      const teacherSessionId = socketToTeacher.get(socket.id)
      if (teacherSessionId) {
        socketToTeacher.delete(socket.id)
      }
    })
  })
}

async function emitSessionState(io: TypedServer, sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      activity: { include: { questions: true } },
      participants: { include: { student: true } },
      teams: { orderBy: { orderIndex: 'asc' }, include: { members: true } },
      classResponses: true,
    },
  })

  if (!session) return

  const classScore = session.classResponses.reduce((sum, r) => sum + r.score, 0)

  io.to(sessionRoom(sessionId)).emit('session:state', {
    sessionId: session.id,
    status: session.status,
    gameCode: session.code,
    mode: session.mode,
    showLeaderboard: session.showLeaderboard,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.activity.questions.length,
    participants: session.participants.map((p) => ({
      studentId: p.studentId,
      displayName: p.student.displayName,
      isConnected: p.isConnected,
      totalScore: p.totalScore,
      teamId: p.teamId,
    })),
    teams: session.teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      score: t.score,
      memberCount: t.members.length,
    })),
    classScore,
  })
}

async function updateTeamScores(sessionId: string) {
  const teams = await prisma.team.findMany({
    where: { sessionId },
    include: { members: true },
  })

  for (const team of teams) {
    const memberIds = team.members.map((m) => m.studentId)
    if (memberIds.length === 0) continue

    const totalScore = await prisma.sessionParticipant.aggregate({
      where: { sessionId, studentId: { in: memberIds } },
      _sum: { totalScore: true },
    })

    await prisma.team.update({
      where: { id: team.id },
      data: { score: totalScore._sum.totalScore || 0 },
    })
  }
}

async function getSessionResultsWithMode(sessionId: string, mode: string) {
  if (mode === 'teacher_led') {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        activity: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
        classResponses: true,
      },
    })
    if (!session) return null

    const totalCorrect = session.classResponses.filter((r) => r.isCorrect).length
    const totalScore = session.classResponses.reduce((sum, r) => sum + r.score, 0)

    return {
      sessionId,
      mode,
      leaderboard: [],
      classResults: {
        totalQuestions: session.activity.questions.length,
        correctCount: totalCorrect,
        totalScore,
        accuracy: session.activity.questions.length > 0
          ? Math.round((totalCorrect / session.activity.questions.length) * 100) : 0,
      },
      questionResults: session.activity.questions.map((q) => {
        const response = session.classResponses.find((r) => r.questionId === q.id)
        return {
          questionId: q.id,
          questionText: q.questionText,
          correctCount: response?.isCorrect ? 1 : 0,
          totalAnswers: response ? 1 : 0,
        }
      }),
    }
  }

  if (mode === 'team') {
    const baseResults = await getSessionResults(sessionId)
    if (!baseResults) return null

    const teams = await prisma.team.findMany({
      where: { sessionId },
      include: { members: true },
      orderBy: { score: 'desc' },
    })

    return {
      ...baseResults,
      mode,
      teamLeaderboard: teams.map((t) => ({
        teamId: t.id,
        teamName: t.name,
        teamColor: t.color,
        totalScore: t.score,
        memberCount: t.members.length,
      })),
    }
  }

  const results = await getSessionResults(sessionId)
  return results ? { ...results, mode } : null
}

interface QuestionRecord {
  id: string
  questionText: string
  questionType: string
  data: string
  points: number
}

function emitQuestionToStudents(
  io: TypedServer,
  sessionId: string,
  question: QuestionRecord,
  index: number,
  total: number,
  timeLimit: number
) {
  const safeData = stripCorrectAnswer(question.questionType, question.data)

  io.to(sessionRoom(sessionId)).emit('question:show', {
    questionIndex: index,
    totalQuestions: total,
    questionId: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    data: safeData,
    timeLimit,
  })
}

function checkClassAnswer(questionType: string, answer: Record<string, unknown>, data: Record<string, unknown>): boolean {
  switch (questionType) {
    case 'quiz':
      return answer.selectedOptionId === data.correctOptionId
    case 'true_false':
      return answer.selectedAnswer === data.correctAnswer
    case 'vocabulary':
      return answer.selectedWord === data.word
    case 'matching': {
      const pairs = (data.pairs as Array<{ id: string; right: string }>) || []
      const submittedPairs = (answer.pairs as Record<string, string>) || {}
      return pairs.every((p) => submittedPairs[p.id] === p.right)
    }
    case 'sentence_builder':
      return JSON.stringify(answer.orderedWords) === JSON.stringify(data.correctOrder)
    case 'order_story':
      return JSON.stringify(answer.orderedItemIds) === JSON.stringify(data.correctOrder)
    case 'grammar_detective': {
      const targets = (data.targets as Array<{ id: string; label: string }>) || []
      const assignments = (answer.labelAssignments as Record<string, string>) || {}
      return targets.every((t) => assignments[t.id] === t.label)
    }
    case 'find_mistake':
      return answer.selectedText === data.mistakeText && answer.correction === data.correctionText
    default:
      return false
  }
}
