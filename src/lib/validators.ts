import { z } from "zod"

// ============== AUTH SCHEMAS ==============

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(
        /[A-Za-z]/,
        "Password must contain at least one letter"
      )
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type RegisterInput = z.infer<typeof registerSchema>

// ============== CLASS MANAGEMENT SCHEMAS ==============

export const createClassSchema = z.object({
  name: z
    .string()
    .min(1, "Class name is required")
    .max(100, "Class name must be at most 100 characters"),
  gradeId: z.string().min(1, "Grade is required"),
})

export type CreateClassInput = z.infer<typeof createClassSchema>

export const updateClassSchema = z.object({
  name: z
    .string()
    .min(1, "Class name is required")
    .max(100, "Class name must be at most 100 characters")
    .optional(),
  gradeId: z.string().min(1, "Grade is required").optional(),
})

export type UpdateClassInput = z.infer<typeof updateClassSchema>

// ============== STUDENT SCHEMAS ==============

export const addStudentSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be at most 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be at most 50 characters"),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be at most 50 characters"),
  classId: z.string().min(1, "Class is required"),
})

export type AddStudentInput = z.infer<typeof addStudentSchema>

export const updateStudentSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be at most 50 characters")
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be at most 50 characters")
    .optional(),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be at most 50 characters")
    .optional(),
})

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>

export const bulkAddStudentsSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  students: z
    .array(
      z.object({
        firstName: z.string().min(1).max(50),
        lastName: z.string().min(1).max(50),
        displayName: z.string().min(1).max(50),
      })
    )
    .min(1, "At least one student is required")
    .max(50, "Maximum 50 students at a time"),
})

export type BulkAddStudentsInput = z.infer<typeof bulkAddStudentsSchema>

// ============== ACTIVITY SCHEMAS ==============

// Individual question data schemas per game type

const quizQuestionDataSchema = z.object({
  type: z.literal("quiz"),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1, "Option text is required"),
      })
    )
    .min(2, "At least 2 options are required")
    .max(6, "Maximum 6 options"),
  correctOptionId: z.string().min(1, "Correct option is required"),
})

const trueFalseQuestionDataSchema = z.object({
  type: z.literal("true_false"),
  statement: z.string().min(1, "Statement is required"),
  correctAnswer: z.boolean(),
})

const matchingQuestionDataSchema = z.object({
  type: z.literal("matching"),
  pairs: z
    .array(
      z.object({
        id: z.string().min(1),
        left: z.string().min(1, "Left item is required"),
        right: z.string().min(1, "Right item is required"),
      })
    )
    .min(2, "At least 2 pairs are required")
    .max(10, "Maximum 10 pairs"),
})

const sentenceBuilderQuestionDataSchema = z.object({
  type: z.literal("sentence_builder"),
  words: z
    .array(z.string().min(1))
    .min(2, "At least 2 words are required"),
  correctOrder: z
    .array(z.string().min(1))
    .min(2, "Correct order must have at least 2 words"),
  hint: z.string().optional(),
})

const orderStoryQuestionDataSchema = z.object({
  type: z.literal("order_story"),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1, "Item text is required"),
      })
    )
    .min(2, "At least 2 items are required")
    .max(10, "Maximum 10 items"),
  correctOrder: z
    .array(z.string().min(1))
    .min(2, "Correct order must have at least 2 items"),
})

const grammarDetectiveQuestionDataSchema = z.object({
  type: z.literal("grammar_detective"),
  sentence: z.string().min(1, "Sentence is required"),
  targets: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
        startIndex: z.number().int().min(0),
        endIndex: z.number().int().min(0),
        label: z.string().min(1, "Label is required"),
      })
    )
    .min(1, "At least one target is required"),
  availableLabels: z
    .array(z.string().min(1))
    .min(1, "At least one label is required"),
})

const findMistakeQuestionDataSchema = z.object({
  type: z.literal("find_mistake"),
  sentenceWithMistake: z.string().min(1, "Sentence is required"),
  correctedSentence: z.string().min(1, "Corrected sentence is required"),
  mistakeText: z.string().min(1, "Mistake text is required"),
  correctionText: z.string().min(1, "Correction text is required"),
  mistakeStartIndex: z.number().int().min(0),
  mistakeEndIndex: z.number().int().min(0),
})

const vocabularyQuestionDataSchema = z.object({
  type: z.literal("vocabulary"),
  word: z.string().min(1, "Word is required"),
  definition: z.string().min(1, "Definition is required"),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
  distractors: z
    .array(z.string().min(1))
    .min(1, "At least 1 distractor is required")
    .max(5, "Maximum 5 distractors"),
  format: z.enum(["definition", "fill_blank", "image_match"]),
  contextSentence: z.string().optional(),
})

/** Discriminated union of all question data schemas */
export const questionDataSchema = z.discriminatedUnion("type", [
  quizQuestionDataSchema,
  trueFalseQuestionDataSchema,
  matchingQuestionDataSchema,
  sentenceBuilderQuestionDataSchema,
  orderStoryQuestionDataSchema,
  grammarDetectiveQuestionDataSchema,
  findMistakeQuestionDataSchema,
  vocabularyQuestionDataSchema,
])

export type QuestionDataInput = z.infer<typeof questionDataSchema>

/** Schema for a single question within an activity */
const questionSchema = z.object({
  questionText: z
    .string()
    .min(1, "Question text is required")
    .max(500, "Question text must be at most 500 characters"),
  explanation: z
    .string()
    .max(500, "Explanation must be at most 500 characters")
    .optional()
    .default(""),
  points: z.number().int().min(1).max(100).optional().default(10),
  data: questionDataSchema,
})

export const createActivitySchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  titleAr: z
    .string()
    .min(1, "Arabic title is required")
    .max(200, "Arabic title must be at most 200 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .default(""),
  descriptionAr: z
    .string()
    .max(500, "Arabic description must be at most 500 characters")
    .optional()
    .default(""),
  gameType: z.enum([
    "quiz",
    "true_false",
    "matching",
    "sentence_builder",
    "order_story",
    "grammar_detective",
    "find_mistake",
    "vocabulary",
  ]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  skillId: z.string().min(1, "Skill is required"),
  timeLimit: z.number().int().min(5).max(300).optional().default(30),
  questions: z
    .array(questionSchema)
    .min(1, "At least one question is required")
    .max(30, "Maximum 30 questions"),
})

export type CreateActivityInput = z.infer<typeof createActivitySchema>

export const updateActivitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  titleAr: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  descriptionAr: z.string().max(500).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  timeLimit: z.number().int().min(5).max(300).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
})

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>

// ============== GAME SESSION SCHEMAS ==============

export const createSessionSchema = z.object({
  activityId: z.string().min(1, "Activity is required"),
  classId: z.string().min(1, "Class is required"),
  mode: z.enum(["individual", "teacher_led", "team"]).optional().default("individual"),
  showLeaderboard: z.boolean().optional().default(true),
  teamCount: z.number().int().min(2).max(8).optional(),
  teamNames: z.array(z.string().min(1).max(50)).optional(),
})

export type CreateSessionInput = z.infer<typeof createSessionSchema>

export const submitAnswerSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  questionId: z.string().min(1, "Question is required"),
  studentId: z.string().min(1, "Student is required"),
  answer: z.string().min(1, "Answer is required"),
  timeSpent: z.number().int().min(0).optional(),
})

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>

// ============== PAGINATION & FILTER SCHEMAS ==============

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>

export const searchSchema = z.object({
  query: z.string().max(200).optional().default(""),
  ...paginationSchema.shape,
})

export type SearchInput = z.infer<typeof searchSchema>
