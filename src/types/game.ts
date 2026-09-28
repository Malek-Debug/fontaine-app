import type { GameType } from "./index"

// ============== QUESTION DATA PER GAME TYPE ==============
// These types represent the JSON stored in the Question.data field.
// Each game type has its own discriminated union variant.

/** Quiz: multiple-choice question with one correct answer */
export interface QuizQuestionData {
  type: typeof GameType.QUIZ
  /** The list of answer options */
  options: Array<{
    id: string
    text: string
  }>
  /** The id of the correct option */
  correctOptionId: string
}

/** True/False question */
export interface TrueFalseQuestionData {
  type: typeof GameType.TRUE_FALSE
  /** A statement that is either true or false */
  statement: string
  /** Whether the statement is true */
  correctAnswer: boolean
}

/** Matching: pairs that the student must match */
export interface MatchingQuestionData {
  type: typeof GameType.MATCHING
  /** Pairs to match; the UI shuffles the right column */
  pairs: Array<{
    id: string
    left: string
    right: string
  }>
}

/** Sentence Builder: drag words into the correct order */
export interface SentenceBuilderQuestionData {
  type: typeof GameType.SENTENCE_BUILDER
  /** The words presented to the student (shuffled in UI) */
  words: string[]
  /** The correct word order */
  correctOrder: string[]
  /** Optional hint shown to the student */
  hint?: string
}

/** Order Story: arrange sentences/paragraphs in logical order */
export interface OrderStoryQuestionData {
  type: typeof GameType.ORDER_STORY
  /** Items to be ordered */
  items: Array<{
    id: string
    text: string
  }>
  /** Correct order of item ids */
  correctOrder: string[]
}

/** Grammar Detective: identify the grammatical role or rule in a sentence */
export interface GrammarDetectiveQuestionData {
  type: typeof GameType.GRAMMAR_DETECTIVE
  /** The sentence to analyze */
  sentence: string
  /** Words or phrases that should be identified */
  targets: Array<{
    id: string
    /** The text to highlight / select */
    text: string
    /** Start index in the sentence */
    startIndex: number
    /** End index in the sentence */
    endIndex: number
    /** Grammatical label (e.g., "subject", "verb", "adjective") */
    label: string
  }>
  /** Labels to choose from */
  availableLabels: string[]
}

/** Find Mistake: spot the error in a sentence */
export interface FindMistakeQuestionData {
  type: typeof GameType.FIND_MISTAKE
  /** The sentence containing a mistake */
  sentenceWithMistake: string
  /** The corrected version of the sentence */
  correctedSentence: string
  /** The erroneous word or phrase */
  mistakeText: string
  /** The correct replacement */
  correctionText: string
  /** Index of the mistake in the sentence */
  mistakeStartIndex: number
  mistakeEndIndex: number
}

/** Vocabulary: definition matching, fill-in-the-blank, or image-word matching */
export interface VocabularyQuestionData {
  type: typeof GameType.VOCABULARY
  /** The target word */
  word: string
  /** Definition or context clue */
  definition: string
  /** Optional image URL for image-word matching */
  imageUrl?: string
  /** Distractor words shown alongside the correct answer */
  distractors: string[]
  /** Format of the vocabulary exercise */
  format: "definition" | "fill_blank" | "image_match"
  /** The sentence with a blank (for fill_blank format) */
  contextSentence?: string
}

// ============== DISCRIMINATED UNION ==============

export type QuestionData =
  | QuizQuestionData
  | TrueFalseQuestionData
  | MatchingQuestionData
  | SentenceBuilderQuestionData
  | OrderStoryQuestionData
  | GrammarDetectiveQuestionData
  | FindMistakeQuestionData
  | VocabularyQuestionData

// ============== STUDENT ANSWER DATA PER GAME TYPE ==============

export interface QuizAnswerData {
  type: typeof GameType.QUIZ
  selectedOptionId: string
}

export interface TrueFalseAnswerData {
  type: typeof GameType.TRUE_FALSE
  selectedAnswer: boolean
}

export interface MatchingAnswerData {
  type: typeof GameType.MATCHING
  /** Student's pairings: left id -> right id */
  pairs: Record<string, string>
}

export interface SentenceBuilderAnswerData {
  type: typeof GameType.SENTENCE_BUILDER
  /** The word order the student chose */
  orderedWords: string[]
}

export interface OrderStoryAnswerData {
  type: typeof GameType.ORDER_STORY
  /** The order of item ids the student chose */
  orderedItemIds: string[]
}

export interface GrammarDetectiveAnswerData {
  type: typeof GameType.GRAMMAR_DETECTIVE
  /** Student's label assignments: target id -> selected label */
  labelAssignments: Record<string, string>
}

export interface FindMistakeAnswerData {
  type: typeof GameType.FIND_MISTAKE
  /** The word/phrase the student identified as the mistake */
  selectedText: string
  /** The correction the student provided */
  correction: string
}

export interface VocabularyAnswerData {
  type: typeof GameType.VOCABULARY
  /** The word the student selected or typed */
  selectedWord: string
}

export type StudentAnswerData =
  | QuizAnswerData
  | TrueFalseAnswerData
  | MatchingAnswerData
  | SentenceBuilderAnswerData
  | OrderStoryAnswerData
  | GrammarDetectiveAnswerData
  | FindMistakeAnswerData
  | VocabularyAnswerData

// ============== HELPER: parse question data from JSON string ==============

export function parseQuestionData(json: string): QuestionData {
  return JSON.parse(json) as QuestionData
}

export function parseStudentAnswer(json: string): StudentAnswerData {
  return JSON.parse(json) as StudentAnswerData
}

export function stringifyQuestionData(data: QuestionData): string {
  return JSON.stringify(data)
}

export function stringifyStudentAnswer(data: StudentAnswerData): string {
  return JSON.stringify(data)
}

// ============== GAME CONFIG ==============

export interface GameTypeConfig {
  type: GameType
  label: string
  labelAr: string
  description: string
  descriptionAr: string
  icon: string
  minQuestions: number
  maxQuestions: number
  defaultTimeLimit: number
}

export const GAME_TYPE_CONFIGS: Record<GameType, GameTypeConfig> = {
  quiz: {
    type: "quiz",
    label: "Quiz",
    labelAr: "اختبار",
    description: "Multiple choice questions",
    descriptionAr: "اسئلة متعددة الخيارات",
    icon: "CircleDot",
    minQuestions: 1,
    maxQuestions: 30,
    defaultTimeLimit: 30,
  },
  true_false: {
    type: "true_false",
    label: "True or False",
    labelAr: "صح او خطا",
    description: "Decide if statements are true or false",
    descriptionAr: "حدد ما اذا كانت العبارات صحيحة ام خاطئة",
    icon: "CheckCircle",
    minQuestions: 1,
    maxQuestions: 30,
    defaultTimeLimit: 20,
  },
  matching: {
    type: "matching",
    label: "Matching",
    labelAr: "مطابقة",
    description: "Match items from two columns",
    descriptionAr: "طابق العناصر من العمودين",
    icon: "Link",
    minQuestions: 1,
    maxQuestions: 15,
    defaultTimeLimit: 60,
  },
  sentence_builder: {
    type: "sentence_builder",
    label: "Sentence Builder",
    labelAr: "بناء الجمل",
    description: "Arrange words to form correct sentences",
    descriptionAr: "رتب الكلمات لتكوين جمل صحيحة",
    icon: "Type",
    minQuestions: 1,
    maxQuestions: 15,
    defaultTimeLimit: 45,
  },
  order_story: {
    type: "order_story",
    label: "Order the Story",
    labelAr: "رتب القصة",
    description: "Put sentences in the correct order",
    descriptionAr: "رتب الجمل بالترتيب الصحيح",
    icon: "ListOrdered",
    minQuestions: 1,
    maxQuestions: 10,
    defaultTimeLimit: 60,
  },
  grammar_detective: {
    type: "grammar_detective",
    label: "Grammar Detective",
    labelAr: "محقق القواعد",
    description: "Identify grammatical elements in sentences",
    descriptionAr: "حدد العناصر النحوية في الجمل",
    icon: "Search",
    minQuestions: 1,
    maxQuestions: 15,
    defaultTimeLimit: 45,
  },
  find_mistake: {
    type: "find_mistake",
    label: "Find the Mistake",
    labelAr: "اكتشف الخطا",
    description: "Find and correct errors in sentences",
    descriptionAr: "اكتشف الاخطاء وصححها في الجمل",
    icon: "AlertTriangle",
    minQuestions: 1,
    maxQuestions: 20,
    defaultTimeLimit: 30,
  },
  vocabulary: {
    type: "vocabulary",
    label: "Vocabulary",
    labelAr: "مفردات",
    description: "Learn and match vocabulary words",
    descriptionAr: "تعلم وطابق الكلمات والمفردات",
    icon: "BookOpen",
    minQuestions: 1,
    maxQuestions: 25,
    defaultTimeLimit: 30,
  },
}
