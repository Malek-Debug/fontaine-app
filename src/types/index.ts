// ============== ENUMS ==============

export const GameType = {
  QUIZ: "quiz",
  TRUE_FALSE: "true_false",
  MATCHING: "matching",
  SENTENCE_BUILDER: "sentence_builder",
  ORDER_STORY: "order_story",
  GRAMMAR_DETECTIVE: "grammar_detective",
  FIND_MISTAKE: "find_mistake",
  VOCABULARY: "vocabulary",
} as const

export type GameType = (typeof GameType)[keyof typeof GameType]

export const Difficulty = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const

export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty]

export const UserRole = {
  ADMIN: "admin",
  TEACHER: "teacher",
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const SessionStatus = {
  WAITING: "waiting",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
} as const

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus]

export const MasteryLevel = {
  NOT_STARTED: "not_started",
  DEVELOPING: "developing",
  PROFICIENT: "proficient",
  MASTERED: "mastered",
} as const

export type MasteryLevel = (typeof MasteryLevel)[keyof typeof MasteryLevel]

export const ActivityStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const

export type ActivityStatus =
  (typeof ActivityStatus)[keyof typeof ActivityStatus]

export const SkillCategory = {
  READING: "reading",
  WRITING: "writing",
  GRAMMAR: "grammar",
  VOCABULARY: "vocabulary",
  EXPRESSION: "expression",
  DICTATION: "dictation",
} as const

export type SkillCategory =
  (typeof SkillCategory)[keyof typeof SkillCategory]

// ============== API RESPONSE TYPES ==============

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ============== ENTITY TYPES ==============

export interface UserInfo {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface ClassInfo {
  id: string
  name: string
  gradeId: string
  academicYear: string
  joinCode: string
  teacherId: string
  studentCount?: number
  grade?: GradeInfo
}

export interface GradeInfo {
  id: string
  name: string
  nameAr: string
  nameFr: string
  level: number
}

export interface SubjectInfo {
  id: string
  name: string
  nameAr: string
  nameFr: string
  icon: string
  gradeId: string
}

export interface UnitInfo {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  themeAr: string
  orderIndex: number
  subjectId: string
}

export interface DomainInfo {
  id: string
  name: string
  nameAr: string
  description: string
  orderIndex: number
  unitId: string
}

export interface LessonInfo {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  orderIndex: number
  domainId: string
}

export interface SkillInfo {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  category: SkillCategory
  lessonId: string
}

export interface StudentInfo {
  id: string
  firstName: string
  lastName: string
  displayName: string
  classId: string
}

export interface ActivityInfo {
  id: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  gameType: GameType
  difficulty: Difficulty
  timeLimit: number
  points: number
  skillId: string
  createdBy: string
  isAiGenerated: boolean
  status: ActivityStatus
  questionCount?: number
  skill?: SkillInfo
}

export interface QuestionInfo {
  id: string
  activityId: string
  orderIndex: number
  questionText: string
  questionType: string
  data: string
  explanation: string
  points: number
}

export interface GameSessionInfo {
  id: string
  code: string
  status: SessionStatus
  activityId: string
  classId: string
  teacherId: string
  currentQuestionIndex: number
  startedAt: string | null
  completedAt: string | null
  participantCount?: number
  activity?: ActivityInfo
  class?: ClassInfo
}

export interface SessionParticipantInfo {
  id: string
  sessionId: string
  studentId: string
  isConnected: boolean
  totalScore: number
  student?: StudentInfo
}

export interface StudentAnswerInfo {
  id: string
  sessionId: string
  studentId: string
  questionId: string
  answer: string
  isCorrect: boolean
  score: number
  timeSpent: number | null
}

export interface StudentResultInfo {
  id: string
  studentId: string
  skillId: string
  totalAttempts: number
  correctCount: number
  masteryLevel: MasteryLevel
  lastAttemptAt: string | null
  skill?: SkillInfo
  student?: StudentInfo
}

// ============== DASHBOARD / ANALYTICS TYPES ==============

export interface ClassAnalytics {
  classId: string
  className: string
  totalStudents: number
  totalSessions: number
  averageScore: number
  masteryDistribution: Record<MasteryLevel, number>
}

export interface StudentProgress {
  studentId: string
  studentName: string
  skillResults: StudentResultInfo[]
  overallMastery: number
  recentActivity: string | null
}

export interface SessionSummary {
  sessionId: string
  activityTitle: string
  className: string
  date: string
  participantCount: number
  averageScore: number
  completionRate: number
}

// ============== CURRICULUM TREE ==============

export interface CurriculumTree {
  grade: GradeInfo
  subjects: Array<
    SubjectInfo & {
      units: Array<
        UnitInfo & {
          domains: Array<
            DomainInfo & {
              lessons: Array<
                LessonInfo & {
                  skills: SkillInfo[]
                }
              >
            }
          >
        }
      >
    }
  >
}
