'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useSocket } from '@/hooks/use-socket'
import type {
  SessionStatePayload,
  QuestionShowPayload,
  QuestionEndedPayload,
  ClassAnswerResultPayload,
  SessionResultsPayload,
} from '@/lib/socket/events'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/cn'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Square,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Droplets,
  BookOpen,
} from 'lucide-react'

type Phase = 'loading' | 'waiting' | 'active' | 'answered' | 'revealed' | 'results'

const OPTION_COLORS = [
  'bg-blue-600 hover:bg-blue-500',
  'bg-emerald-600 hover:bg-emerald-500',
  'bg-amber-600 hover:bg-amber-500',
  'bg-rose-600 hover:bg-rose-500',
  'bg-purple-600 hover:bg-purple-500',
  'bg-cyan-600 hover:bg-cyan-500',
]
const OPTION_LABELS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و']

export default function ProjectorPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const t = useTranslations('classroom')

  const { emit, on, isConnected } = useSocket()

  const [phase, setPhase] = useState<Phase>('loading')
  const [sessionState, setSessionState] = useState<SessionStatePayload | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionShowPayload | null>(null)
  const [endedData, setEndedData] = useState<QuestionEndedPayload | null>(null)
  const [classAnswerResult, setClassAnswerResult] = useState<ClassAnswerResultPayload | null>(null)
  const [results, setResults] = useState<SessionResultsPayload | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [classScore, setClassScore] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const joinAsTeacher = useCallback(() => {
    emit('teacher:join', { sessionId }, (res) => {
      if (!res.ok) console.error('Failed to join as teacher:', res.error)
    })
  }, [sessionId, emit])

  useEffect(() => {
    if (isConnected) joinAsTeacher()
  }, [isConnected, joinAsTeacher])

  useEffect(() => {
    const unsubs: Array<() => void> = []

    unsubs.push(
      on('session:state', (data) => {
        setSessionState(data)
        setClassScore(data.classScore || 0)
        if (data.status === 'waiting') setPhase('waiting')
        else if (data.status === 'completed') setPhase('results')
        else if (data.status === 'active' && phase === 'loading') setPhase('active')
      })
    )

    unsubs.push(
      on('question:show', (data) => {
        setCurrentQuestion(data)
        setEndedData(null)
        setClassAnswerResult(null)
        setShowExplanation(false)
        setPhase('active')
        setTimeLeft(data.timeLimit)

        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current!)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      })
    )

    unsubs.push(
      on('question:ended', (data) => {
        setEndedData(data)
        setPhase('revealed')
        if (timerRef.current) clearInterval(timerRef.current)
      })
    )

    unsubs.push(
      on('class:answer-result', (data) => {
        setClassAnswerResult(data)
        setClassScore(data.classScore)
        setPhase('answered')
      })
    )

    unsubs.push(
      on('session:results', (data) => {
        setResults(data)
        setPhase('results')
        if (timerRef.current) clearInterval(timerRef.current)
      })
    )

    return () => {
      unsubs.forEach((fn) => fn())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [on, phase])

  const handleStart = () => {
    setActionLoading(true)
    emit('teacher:start-session', { sessionId }, () => setActionLoading(false))
  }

  const handleNext = () => {
    setActionLoading(true)
    emit('teacher:next-question', { sessionId }, () => setActionLoading(false))
  }

  const handlePrev = () => {
    emit('teacher:prev-question', { sessionId }, () => {})
  }

  const handlePause = () => {
    emit('teacher:pause-session', { sessionId }, () => {})
  }

  const handleResume = () => {
    emit('teacher:resume-session', { sessionId }, () => {})
  }

  const handleReveal = () => {
    emit('teacher:reveal-answer', { sessionId }, () => {})
  }

  const handleEnd = () => {
    setActionLoading(true)
    emit('teacher:end-session', { sessionId }, () => setActionLoading(false))
  }

  const handleAwardPoint = () => {
    emit('teacher:award-point', { sessionId }, () => {})
  }

  const handleRemovePoint = () => {
    emit('teacher:remove-point', { sessionId }, () => {})
  }

  const handleClassAnswer = (answerJson: string) => {
    if (!currentQuestion) return
    emit('teacher:class-answer', {
      sessionId,
      questionId: currentQuestion.questionId,
      answer: answerJson,
    }, () => {})
  }

  // --- LOADING ---
  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-900">
        <div className="text-center">
          <Spinner size="lg" className="text-white" />
          <p className="mt-4 text-xl text-neutral-400">{t('startPresenting')}</p>
        </div>
      </div>
    )
  }

  // --- WAITING ---
  if (phase === 'waiting' && sessionState) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 px-8">
        <div className="text-center animate-fadeIn">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20">
            <Droplets className="h-10 w-10 text-white" />
          </div>
          <h1 className="mt-6 text-5xl font-bold text-white tracking-tight">Fontaine</h1>
          <p className="mt-3 text-xl text-neutral-400">{t('teacherLedMode')}</p>
        </div>

        <div className="mt-12 rounded-3xl bg-neutral-800/80 backdrop-blur px-16 py-10 text-center border border-neutral-700/50 shadow-2xl">
          <p className="text-lg font-medium text-neutral-400 mb-4">{t('scanToJoin')}</p>
          <div
            dir="ltr"
            className="text-7xl font-mono font-bold tracking-[0.4em] text-primary-400"
          >
            {sessionState.gameCode}
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={actionLoading}
          className="mt-12 rounded-2xl bg-primary-600 px-16 py-6 text-3xl font-bold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          <Play className="inline-block h-8 w-8 me-3" />
          {t('startPresenting')}
        </button>
      </div>
    )
  }

  // --- RESULTS ---
  if (phase === 'results') {
    const classResults = results?.classResults
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 px-8">
        <div className="animate-fadeIn text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-500/20">
            <Trophy className="h-10 w-10 text-accent-400" />
          </div>
          <h1 className="mt-6 text-5xl font-bold text-white tracking-tight">{t('classResults')}</h1>
        </div>

        {classResults && (
          <div className="mt-10 grid grid-cols-3 gap-8 text-center animate-slideUp">
            <div className="rounded-2xl bg-neutral-800/80 border border-neutral-700/50 px-12 py-8">
              <p className="text-7xl font-bold text-primary-400 tracking-tight">{classResults.accuracy}%</p>
              <p className="mt-3 text-lg font-medium text-neutral-400">{t('accuracy')}</p>
            </div>
            <div className="rounded-2xl bg-neutral-800/80 border border-neutral-700/50 px-12 py-8">
              <p className="text-7xl font-bold text-emerald-400 tracking-tight">
                {classResults.correctCount}/{classResults.totalQuestions}
              </p>
              <p className="mt-3 text-lg font-medium text-neutral-400">{t('correct')}</p>
            </div>
            <div className="rounded-2xl bg-neutral-800/80 border border-neutral-700/50 px-12 py-8">
              <p className="text-7xl font-bold text-amber-400 tracking-tight">{classResults.totalScore}</p>
              <p className="mt-3 text-lg font-medium text-neutral-400">{t('totalScore')}</p>
            </div>
          </div>
        )}

        {results?.questionResults && (
          <div className="mt-10 w-full max-w-4xl space-y-3">
            {results.questionResults.map((qr, i) => {
              const isCorrect = qr.correctCount > 0
              return (
                <div
                  key={qr.questionId}
                  className="flex items-center gap-4 rounded-xl bg-neutral-800/80 border border-neutral-700/40 px-6 py-4 transition-colors hover:bg-neutral-800"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-700 text-lg font-bold text-neutral-300">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xl text-neutral-200 truncate">
                    {qr.questionText}
                  </span>
                  {isCorrect ? (
                    <CheckCircle className="h-8 w-8 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-8 w-8 text-rose-400 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // --- ACTIVE / ANSWERED / REVEALED ---
  if (!currentQuestion || !sessionState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-900">
        <Spinner size="lg" className="text-white" />
      </div>
    )
  }

  const qData = parseQuestionData(currentQuestion.questionType, currentQuestion.data)
  const isAnswered = phase === 'answered'
  const isRevealed = phase === 'revealed'
  const isPaused = sessionState.status === 'paused'

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-neutral-900 to-neutral-950 text-white">
      {/* Top bar: progress + timer + score */}
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-neutral-300 tracking-tight">
            {t('questionOf', {
              current: currentQuestion.questionIndex + 1,
              total: currentQuestion.totalQuestions,
            })}
          </span>
          <div className="h-2.5 w-48 rounded-full bg-neutral-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-primary-500 to-primary-400 transition-all duration-500"
              style={{
                width: `${((currentQuestion.questionIndex + 1) / currentQuestion.totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2">
            <Star className="h-6 w-6 text-amber-400" />
            <span className="text-3xl font-bold text-amber-400 tracking-tight">{classScore}</span>
          </div>
          <div className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2',
            timeLeft <= 5 ? 'bg-rose-500/15' : 'bg-neutral-800'
          )}>
            <Clock className={cn('h-6 w-6', timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-neutral-400')} />
            <span className={cn(
              'text-3xl font-mono font-bold',
              timeLeft <= 5 ? 'text-rose-400' : 'text-neutral-300'
            )}>
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Question text */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 pb-4">
        <h2 className="text-center text-5xl font-bold leading-relaxed text-white md:text-6xl">
          {currentQuestion.questionText}
        </h2>

        {/* Feedback overlay */}
        {isAnswered && classAnswerResult && (
          <div
            className={`mt-6 rounded-2xl px-12 py-4 text-3xl font-bold ${
              classAnswerResult.isCorrect
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {classAnswerResult.isCorrect ? (
              <><CheckCircle className="inline-block h-8 w-8 me-3" />{t('correct')}</>
            ) : (
              <><XCircle className="inline-block h-8 w-8 me-3" />{t('incorrect')}</>
            )}
          </div>
        )}

        {/* Explanation */}
        {showExplanation && qData.explanation && (
          <div className="mt-6 max-w-3xl rounded-2xl bg-neutral-800 px-8 py-6 text-center text-2xl text-neutral-300 leading-relaxed">
            {qData.explanation}
          </div>
        )}

        {/* Answer area */}
        <div className="mt-10 w-full max-w-5xl">
          {renderAnswerArea(
            currentQuestion.questionType,
            qData,
            handleClassAnswer,
            isAnswered || isRevealed,
            classAnswerResult,
            endedData
          )}
        </div>
      </div>

      {/* Teacher controls bar */}
      <div className="flex items-center justify-center gap-3 bg-neutral-800/80 border-t border-neutral-700/40 px-6 py-4 backdrop-blur-sm">
        {isPaused ? (
          <ControlButton onClick={handleResume} icon={<Play className="h-5 w-5" />} label={t('resume')} />
        ) : (
          <ControlButton onClick={handlePause} icon={<Pause className="h-5 w-5" />} label={t('pause')} />
        )}
        <ControlButton
          onClick={handlePrev}
          icon={<SkipBack className="h-5 w-5" />}
          label={t('previous')}
          disabled={currentQuestion.questionIndex <= 0}
        />
        <ControlButton
          onClick={handleReveal}
          icon={<Eye className="h-5 w-5" />}
          label={t('revealAnswer')}
          disabled={isRevealed}
        />
        <ControlButton
          onClick={handleAwardPoint}
          icon={<ThumbsUp className="h-5 w-5" />}
          label={t('awardPoint')}
          variant="success"
        />
        <ControlButton
          onClick={handleRemovePoint}
          icon={<ThumbsDown className="h-5 w-5" />}
          label={t('removePoint')}
          variant="danger"
        />
        {qData.explanation && (
          <ControlButton
            onClick={() => setShowExplanation((p) => !p)}
            icon={<BookOpen className="h-5 w-5" />}
            label={t('showExplanation')}
            active={showExplanation}
          />
        )}
        <ControlButton
          onClick={handleNext}
          icon={<SkipForward className="h-5 w-5" />}
          label={currentQuestion.questionIndex + 1 >= currentQuestion.totalQuestions ? t('classResults') : t('skip')}
          variant="primary"
          loading={actionLoading}
        />
        <ControlButton
          onClick={handleEnd}
          icon={<Square className="h-5 w-5" />}
          label={t('endPresentation')}
          variant="danger"
        />
      </div>
    </div>
  )
}

function ControlButton({
  onClick,
  icon,
  label,
  disabled,
  variant,
  active,
  loading,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  disabled?: boolean
  variant?: 'primary' | 'success' | 'danger'
  active?: boolean
  loading?: boolean
}) {
  const base = 'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100'
  const styles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-500 shadow-sm shadow-primary-600/20',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-600/20',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-600/20',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        base,
        variant
          ? styles[variant]
          : active
            ? 'bg-neutral-600 text-white'
            : 'bg-neutral-700/80 text-neutral-200 hover:bg-neutral-600'
      )}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}

interface ParsedData {
  options?: Array<{ id: string; text: string }>
  correctOptionId?: string
  statement?: string
  correctAnswer?: boolean
  word?: string
  definition?: string
  distractors?: string[]
  explanation?: string
  pairs?: Array<{ id: string; left: string; right: string }>
  words?: string[]
  correctOrder?: string[]
  items?: Array<{ id: string; text: string }>
  sentence?: string
  sentenceWithMistake?: string
  correctedSentence?: string
  mistakeText?: string
  correctionText?: string
  targets?: Array<{ id: string; text: string; label: string }>
}

function parseQuestionData(questionType: string, dataStr: string): ParsedData {
  try {
    const raw = JSON.parse(dataStr)
    return { ...raw }
  } catch {
    return {}
  }
}

function renderAnswerArea(
  questionType: string,
  data: ParsedData,
  onAnswer: (json: string) => void,
  disabled: boolean,
  classResult: ClassAnswerResultPayload | null,
  endedData: QuestionEndedPayload | null,
) {
  const correctAnswer = endedData ? parseCorrectAnswer(endedData.correctAnswer) : null

  switch (questionType) {
    case 'quiz':
      return renderQuizOptions(data, onAnswer, disabled, classResult, correctAnswer)
    case 'true_false':
      return renderTrueFalse(data, onAnswer, disabled, classResult, correctAnswer)
    case 'vocabulary':
      return renderVocabulary(data, onAnswer, disabled, classResult, correctAnswer)
    default:
      return renderManualJudge(data, questionType, onAnswer, disabled)
  }
}

function parseCorrectAnswer(json: string): Record<string, unknown> | null {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function renderQuizOptions(
  data: ParsedData,
  onAnswer: (json: string) => void,
  disabled: boolean,
  classResult: ClassAnswerResultPayload | null,
  correctAnswer: Record<string, unknown> | null,
) {
  const options = data.options || []
  const submittedAnswer = classResult ? JSON.parse(classResult.answer) : null

  return (
    <div className="grid grid-cols-2 gap-4">
      {options.map((opt, i) => {
        const isSelected = submittedAnswer?.selectedOptionId === opt.id
        const isCorrectOption = correctAnswer
          ? correctAnswer.selectedOptionId === opt.id || data.correctOptionId === opt.id
          : false
        const showCorrect = correctAnswer && isCorrectOption
        const showWrong = isSelected && classResult && !classResult.isCorrect

        let bgClass = OPTION_COLORS[i % OPTION_COLORS.length]
        if (showCorrect) bgClass = 'bg-emerald-500 ring-4 ring-emerald-300'
        else if (showWrong) bgClass = 'bg-rose-500 ring-4 ring-rose-300'
        else if (isSelected) bgClass = 'bg-neutral-500'

        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(JSON.stringify({ selectedOptionId: opt.id }))}
            className={`flex items-center gap-5 rounded-2xl px-8 py-6 text-start text-white transition-all ${bgClass} ${
              disabled ? 'cursor-default' : 'hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
              {OPTION_LABELS[i]}
            </span>
            <span className="text-2xl font-semibold leading-snug md:text-3xl">
              {opt.text}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function renderTrueFalse(
  data: ParsedData,
  onAnswer: (json: string) => void,
  disabled: boolean,
  classResult: ClassAnswerResultPayload | null,
  correctAnswer: Record<string, unknown> | null,
) {
  const submittedAnswer = classResult ? JSON.parse(classResult.answer) : null
  const options = [
    { value: true, label: 'صحيح', icon: <CheckCircle className="h-10 w-10" />, color: 'bg-emerald-600 hover:bg-emerald-500' },
    { value: false, label: 'خطأ', icon: <XCircle className="h-10 w-10" />, color: 'bg-rose-600 hover:bg-rose-500' },
  ]

  return (
    <div className="flex items-center justify-center gap-8">
      {options.map((opt) => {
        const isSelected = submittedAnswer?.selectedAnswer === opt.value
        const isCorrectOpt = correctAnswer ? data.correctAnswer === opt.value : false
        const showCorrect = correctAnswer && isCorrectOpt

        let bgClass = opt.color
        if (showCorrect) bgClass = 'bg-emerald-500 ring-4 ring-emerald-300'
        else if (isSelected && classResult && !classResult.isCorrect) bgClass = 'bg-rose-500 ring-4 ring-rose-300'

        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(JSON.stringify({ selectedAnswer: opt.value }))}
            className={`flex flex-col items-center gap-4 rounded-3xl px-20 py-10 text-white transition-all ${bgClass} ${
              disabled ? 'cursor-default' : 'hover:scale-[1.02]'
            }`}
          >
            {opt.icon}
            <span className="text-4xl font-bold">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function renderVocabulary(
  data: ParsedData,
  onAnswer: (json: string) => void,
  disabled: boolean,
  classResult: ClassAnswerResultPayload | null,
  correctAnswer: Record<string, unknown> | null,
) {
  const allWords = [data.word || '', ...(data.distractors || [])].filter(Boolean)
  const submittedAnswer = classResult ? JSON.parse(classResult.answer) : null

  return (
    <div className="space-y-6">
      {data.definition && (
        <p className="text-center text-3xl text-neutral-300 leading-relaxed">{data.definition}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        {allWords.map((word, i) => {
          const isSelected = submittedAnswer?.selectedWord === word
          const isCorrectWord = correctAnswer ? data.word === word : false
          const showCorrect = correctAnswer && isCorrectWord

          let bgClass = OPTION_COLORS[i % OPTION_COLORS.length]
          if (showCorrect) bgClass = 'bg-emerald-500 ring-4 ring-emerald-300'
          else if (isSelected && classResult && !classResult.isCorrect) bgClass = 'bg-rose-500 ring-4 ring-rose-300'

          return (
            <button
              key={word}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer(JSON.stringify({ selectedWord: word }))}
              className={`rounded-2xl px-8 py-6 text-3xl font-bold text-white transition-all ${bgClass} ${
                disabled ? 'cursor-default' : 'hover:scale-[1.02]'
              }`}
            >
              {word}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function renderManualJudge(
  data: ParsedData,
  questionType: string,
  _onAnswer: (json: string) => void,
  disabled: boolean,
) {
  let content: React.ReactNode = null

  switch (questionType) {
    case 'matching':
      content = (
        <div className="space-y-3">
          {(data.pairs || []).map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl bg-neutral-800 px-6 py-4">
              <span className="flex-1 text-2xl text-end text-white">{p.left}</span>
              <span className="text-2xl text-neutral-500">↔</span>
              <span className="flex-1 text-2xl text-white">{p.right}</span>
            </div>
          ))}
        </div>
      )
      break
    case 'sentence_builder':
      content = (
        <div className="flex flex-wrap justify-center gap-3">
          {(data.words || []).map((w, i) => (
            <span key={i} className="rounded-xl bg-neutral-700 px-6 py-4 text-2xl font-semibold text-white">
              {w}
            </span>
          ))}
        </div>
      )
      break
    case 'order_story':
      content = (
        <div className="space-y-3">
          {(data.items || []).map((item) => (
            <div key={item.id} className="rounded-xl bg-neutral-800 px-6 py-4 text-2xl text-white">
              {item.text}
            </div>
          ))}
        </div>
      )
      break
    case 'grammar_detective':
      content = (
        <div className="text-center">
          <p className="text-3xl leading-relaxed text-white">{data.sentence}</p>
          {data.targets && (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {data.targets.map((t) => (
                <span key={t.id} className="rounded-lg bg-primary-700 px-4 py-2 text-xl text-white">
                  {t.text} → {t.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )
      break
    case 'find_mistake':
      content = (
        <div className="text-center space-y-4">
          <p className="text-3xl leading-relaxed text-white">{data.sentenceWithMistake}</p>
          {data.mistakeText && (
            <p className="text-2xl text-rose-400">
              {data.mistakeText} → {data.correctionText}
            </p>
          )}
        </div>
      )
      break
  }

  return (
    <div className="space-y-6">
      {content}
      {!disabled && (
        <p className="text-center text-xl text-neutral-500 mt-4">
          استخدم أزرار ✓ أو ✗ أدناه للتقييم
        </p>
      )}
    </div>
  )
}
