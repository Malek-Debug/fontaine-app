export interface ServerToClientEvents {
  'session:state': (data: SessionStatePayload) => void
  'session:student-joined': (data: StudentJoinedPayload) => void
  'session:student-left': (data: { studentId: string }) => void
  'question:show': (data: QuestionShowPayload) => void
  'question:ended': (data: QuestionEndedPayload) => void
  'answer:received': (data: AnswerReceivedPayload) => void
  'answer:result': (data: AnswerResultPayload) => void
  'session:results': (data: SessionResultsPayload) => void
  'session:error': (data: { message: string }) => void
  'class:answer-result': (data: ClassAnswerResultPayload) => void
}

export interface ClientToServerEvents {
  'student:join': (
    data: { gameCode: string; studentId: string; teamId?: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'student:select-team': (
    data: { teamId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:join': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:start-session': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:next-question': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:prev-question': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:end-session': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:pause-session': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:resume-session': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:reveal-answer': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:class-answer': (
    data: { sessionId: string; questionId: string; answer: string },
    callback: (res: { ok: boolean; error?: string; isCorrect?: boolean }) => void
  ) => void
  'teacher:award-point': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'teacher:remove-point': (
    data: { sessionId: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
  'answer:submit': (
    data: AnswerSubmitPayload,
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void
}

export interface SessionStatePayload {
  sessionId: string
  status: string
  gameCode: string
  mode: string
  showLeaderboard: boolean
  currentQuestionIndex: number
  totalQuestions: number
  participants: Array<{
    studentId: string
    displayName: string
    isConnected: boolean
    totalScore: number
    teamId?: string | null
  }>
  teams?: Array<{
    id: string
    name: string
    color: string
    score: number
    memberCount: number
  }>
  classScore?: number
}

export interface StudentJoinedPayload {
  studentId: string
  displayName: string
}

export interface QuestionShowPayload {
  questionIndex: number
  totalQuestions: number
  questionId: string
  questionText: string
  questionType: string
  data: string
  timeLimit: number
}

export interface QuestionEndedPayload {
  questionId: string
  correctAnswer: string
  stats: {
    totalAnswers: number
    correctCount: number
    averageTime: number
  }
}

export interface AnswerReceivedPayload {
  studentId: string
  displayName: string
  questionId: string
  answeredAt: number
}

export interface AnswerResultPayload {
  questionId: string
  isCorrect: boolean
  score: number
  timeSpent: number
}

export interface AnswerSubmitPayload {
  sessionId: string
  questionId: string
  studentId: string
  answer: string
  timeSpent: number
}

export interface SessionResultsPayload {
  sessionId: string
  mode: string
  leaderboard: Array<{
    studentId: string
    displayName: string
    totalScore: number
    correctCount: number
    totalQuestions: number
  }>
  teamLeaderboard?: Array<{
    teamId: string
    teamName: string
    teamColor: string
    totalScore: number
    memberCount: number
  }>
  classResults?: {
    totalQuestions: number
    correctCount: number
    totalScore: number
    accuracy: number
  }
  questionResults: Array<{
    questionId: string
    questionText: string
    correctCount: number
    totalAnswers: number
  }>
}

export interface ClassAnswerResultPayload {
  questionId: string
  answer: string
  isCorrect: boolean
  correctAnswer: string
  classScore: number
}
