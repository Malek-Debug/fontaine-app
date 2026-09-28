'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useSocket } from '@/hooks/use-socket'
import type {
  SessionStatePayload,
  QuestionShowPayload,
  QuestionEndedPayload,
  AnswerResultPayload,
  SessionResultsPayload,
} from '@/lib/socket/events'
import { ActivityRenderer } from '@/components/game/activity-renderer'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/cn'
import { Trophy, CheckCircle, XCircle, Clock, Droplets } from 'lucide-react'

type GamePhase = 'connecting' | 'team-select' | 'waiting' | 'playing' | 'answered' | 'review' | 'results'

export default function StudentGamePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const t = useTranslations('games')
  const tCommon = useTranslations('common')
  const tClass = useTranslations('classroom')

  const gameCode = params.code as string
  const studentId = searchParams.get('student') || ''

  const { emit, on, isConnected } = useSocket()

  const [phase, setPhase] = useState<GamePhase>('connecting')
  const [error, setError] = useState('')
  const [sessionState, setSessionState] = useState<SessionStatePayload | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionShowPayload | null>(null)
  const [answerResult, setAnswerResult] = useState<AnswerResultPayload | null>(null)
  const [endedData, setEndedData] = useState<QuestionEndedPayload | null>(null)
  const [results, setResults] = useState<SessionResultsPayload | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  const questionStartTime = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const hasJoined = useRef(false)
  const rendererKey = useRef(0)

  const joinSession = useCallback(() => {
    if (!gameCode || !studentId || hasJoined.current) return
    hasJoined.current = true

    emit('student:join', { gameCode, studentId }, (res) => {
      if (res.ok) {
        setError('')
      } else {
        setError(res.error || 'Failed to join')
        hasJoined.current = false
      }
    })
  }, [gameCode, studentId, emit])

  useEffect(() => {
    if (isConnected) {
      hasJoined.current = false
      joinSession()
    }
  }, [isConnected, joinSession])

  useEffect(() => {
    const unsubs: Array<() => void> = []

    unsubs.push(
      on('session:state', (data) => {
        setSessionState(data)
        if (data.mode === 'team' && data.teams && data.teams.length > 0) {
          const myParticipant = data.participants.find((p) => p.studentId === studentId)
          if (!myParticipant?.teamId && phase === 'connecting') {
            setPhase('team-select')
            return
          }
        }
        if (phase === 'connecting' || phase === 'team-select') {
          if (data.status === 'waiting') setPhase('waiting')
          else if (data.status === 'active') setPhase('playing')
        }
      })
    )

    unsubs.push(
      on('question:show', (data) => {
        setCurrentQuestion(data)
        setHasAnswered(false)
        setAnswerResult(null)
        setEndedData(null)
        setPhase('playing')
        setTimeLeft(data.timeLimit)
        questionStartTime.current = Date.now()
        rendererKey.current += 1

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
        setPhase('review')
        if (timerRef.current) clearInterval(timerRef.current)
      })
    )

    unsubs.push(
      on('answer:result', (data) => {
        setAnswerResult(data)
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

    unsubs.push(
      on('session:error', (data) => {
        setError(data.message)
      })
    )

    return () => {
      unsubs.forEach((fn) => fn())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [on, phase, studentId])

  const handleAnswer = useCallback((answerJson: string) => {
    if (hasAnswered || phase !== 'playing' || !currentQuestion || !sessionState) return
    setHasAnswered(true)

    const timeSpent = Date.now() - questionStartTime.current

    emit('answer:submit', {
      sessionId: sessionState.sessionId,
      questionId: currentQuestion.questionId,
      studentId,
      answer: answerJson,
      timeSpent,
    }, (res) => {
      if (!res.ok) {
        setError(res.error || 'Failed to submit')
        setHasAnswered(false)
      }
    })
  }, [hasAnswered, phase, currentQuestion, sessionState, studentId, emit])

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId)
    emit('student:select-team', { teamId }, (res) => {
      if (res.ok) {
        setPhase('waiting')
      } else {
        setError(res.error || 'Failed to join team')
        setSelectedTeamId(null)
      }
    })
  }

  // ---------- CONNECTING ----------
  if (phase === 'connecting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-b from-primary-50 via-white to-white">
        <div className="text-center animate-fadeIn">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
            <Spinner size="lg" />
          </div>
          <p className="mt-4 text-sm font-medium text-neutral-500">{tCommon('loading')}</p>
          {error && (
            <p className="mt-3 rounded-xl bg-danger-50 px-4 py-2 text-sm text-danger-600">{error}</p>
          )}
        </div>
      </div>
    )
  }

  // ---------- TEAM SELECT ----------
  if (phase === 'team-select' && sessionState?.teams) {
    return (
      <div className="flex min-h-screen flex-col items-center px-4 pt-12 bg-gradient-to-b from-primary-50 via-white to-white">
        <div className="text-center animate-fadeIn">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100">
            <Droplets className="h-7 w-7 text-primary-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">{tClass('selectTeam')}</h1>
          <p className="mt-1.5 text-sm text-neutral-500">{tClass('joinTeam')}</p>
        </div>

        <div className="mt-8 w-full max-w-sm space-y-3">
          {sessionState.teams.map((team, i) => (
            <button
              key={team.id}
              type="button"
              onClick={() => handleSelectTeam(team.id)}
              disabled={selectedTeamId !== null}
              className={cn(
                'w-full rounded-2xl border-2 px-5 py-4 text-start transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50',
                `animate-stagger-${Math.min(i + 1, 5)}`
              )}
              style={{ borderColor: team.color, backgroundColor: team.color + '08' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold" style={{ color: team.color }}>{team.name}</span>
                <span className="text-xs font-medium text-neutral-400">
                  {tClass('teamMembers', { count: team.memberCount })}
                </span>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-danger-50 px-4 py-2 text-sm text-danger-600">{error}</p>
        )}
      </div>
    )
  }

  // ---------- WAITING ----------
  if (phase === 'waiting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-b from-primary-50 via-white to-white">
        <div className="text-center animate-fadeIn">
          <div className="relative mx-auto">
            <div className="h-20 w-20 rounded-2xl bg-primary-100 animate-pulse-soft" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Clock className="h-9 w-9 text-primary-600" />
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-neutral-900">{t('waitingForTeacher')}</h2>
          <p className="mt-1.5 text-sm text-neutral-500">{t('getReady')}</p>
          {sessionState && (
            <p className="mt-4 text-sm font-medium text-primary-600">
              {sessionState.participants.length} {t('playersJoined')}
            </p>
          )}
          {sessionState?.mode === 'team' && sessionState.teams && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {sessionState.teams.map((team) => (
                <span
                  key={team.id}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: team.color }}
                >
                  {team.name}: {team.memberCount}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------- RESULTS ----------
  if (phase === 'results' && results) {
    const myResult = results.leaderboard.find((l) => l.studentId === studentId)
    const myRank = results.leaderboard.findIndex((l) => l.studentId === studentId) + 1

    return (
      <div className="flex min-h-screen flex-col items-center px-4 pt-12 pb-8 bg-gradient-to-b from-primary-50 via-white to-white">
        <div className="text-center animate-fadeIn">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50">
            <Trophy className="h-8 w-8 text-accent-500" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">{t('results')}</h2>
        </div>

        {/* Team results */}
        {results.teamLeaderboard && results.teamLeaderboard.length > 0 && (
          <div className="mt-6 w-full max-w-sm animate-slideUp">
            <h3 className="mb-3 text-base font-semibold text-neutral-900">{tClass('teamResults')}</h3>
            <div className="space-y-2">
              {results.teamLeaderboard.map((team, i) => (
                <div
                  key={team.teamId}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 border-s-4"
                  style={{ backgroundColor: team.teamColor + '10', borderColor: team.teamColor }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: team.teamColor }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium text-neutral-900">{team.teamName}</span>
                  <span className="text-lg font-bold" style={{ color: team.teamColor }}>{team.totalScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {myResult && (
          <div className="mt-6 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-lg border border-neutral-100 animate-slideUp">
            <p className="text-5xl font-bold tracking-tight text-primary-600">
              {myResult.correctCount}/{myResult.totalQuestions}
            </p>
            <p className="mt-2 text-sm text-neutral-500">{t('correctAnswers')}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2">
              <Trophy className="h-5 w-5 text-primary-600" />
              <span className="font-bold text-primary-700">
                #{myRank}
              </span>
            </div>
          </div>
        )}

        {/* Individual leaderboard */}
        {results.leaderboard.length > 0 && (
          <div className="mt-8 w-full max-w-sm animate-slideUp">
            <h3 className="mb-3 text-base font-semibold text-neutral-900">{t('leaderboard')}</h3>
            <div className="space-y-2">
              {results.leaderboard.slice(0, 10).map((entry, i) => (
                <div
                  key={entry.studentId}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3',
                    entry.studentId === studentId
                      ? 'bg-primary-50 border-2 border-primary-200'
                      : 'bg-white border border-neutral-200/80'
                  )}
                >
                  <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                    i === 0 ? 'bg-accent-100 text-accent-700' : i === 1 ? 'bg-neutral-200 text-neutral-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-500'
                  )}>
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium text-neutral-900 truncate">
                    {entry.displayName}
                  </span>
                  <span className="text-sm font-bold text-primary-600">
                    {entry.correctCount}/{entry.totalQuestions}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------- PLAYING / ANSWERED / REVIEW ----------
  if (currentQuestion) {
    const rendererPhase: 'playing' | 'answered' | 'review' =
      phase === 'review' ? 'review' : phase === 'answered' ? 'answered' : 'playing'

    return (
      <div className="flex min-h-screen flex-col bg-white">
        <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-neutral-100">
          <span className="text-sm font-semibold text-neutral-600">
            {currentQuestion.questionIndex + 1} / {currentQuestion.totalQuestions}
          </span>
          <div className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1',
            timeLeft <= 5 ? 'bg-danger-50' : 'bg-neutral-50'
          )}>
            <Clock className={cn('h-4 w-4', timeLeft <= 5 ? 'text-danger-500' : 'text-neutral-400')} />
            <span className={cn(
              'text-lg font-bold font-mono',
              timeLeft <= 5 ? 'text-danger-500 animate-pulse' : 'text-neutral-900'
            )}>
              {timeLeft}
            </span>
          </div>
        </div>

        <div className="h-1.5 bg-neutral-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r rtl:bg-gradient-to-l from-primary-500 to-primary-400 transition-all duration-500"
            style={{
              width: `${((currentQuestion.questionIndex + 1) / currentQuestion.totalQuestions) * 100}%`,
            }}
          />
        </div>

        <div className="flex-1 flex flex-col px-4 pt-8 pb-4">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-neutral-900 leading-relaxed tracking-tight sm:text-2xl">
              {currentQuestion.questionText}
            </h2>
          </div>

          {phase === 'answered' && answerResult && !endedData && (
            <div className={cn(
              'mb-4 mx-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-semibold animate-scaleIn',
              answerResult.isCorrect ? 'bg-success-500' : 'bg-danger-500'
            )}>
              {answerResult.isCorrect ? (
                <><CheckCircle className="h-5 w-5" /> {t('correct')}</>
              ) : (
                <><XCircle className="h-5 w-5" /> {t('wrong')}</>
              )}
            </div>
          )}

          {phase === 'review' && endedData && (
            <div className="mb-4 mx-auto rounded-xl bg-neutral-50 border border-neutral-200/80 px-5 py-3 text-center text-sm font-medium text-neutral-600">
              {endedData.stats.correctCount}/{endedData.stats.totalAnswers} {t('gotItRight')}
            </div>
          )}

          <ActivityRenderer
            key={rendererKey.current}
            questionType={currentQuestion.questionType}
            questionText={currentQuestion.questionText}
            data={currentQuestion.data}
            phase={rendererPhase}
            answerResult={answerResult}
            endedData={endedData}
            onAnswer={handleAnswer}
            disabled={hasAnswered || phase !== 'playing'}
          />

          {(phase === 'answered' || phase === 'review') && (
            <div className="mt-8 text-center">
              <Spinner size="sm" />
              <p className="mt-2 text-sm text-neutral-500">{t('waitingForNext')}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Spinner size="lg" />
      <p className="mt-4 text-neutral-600">{tCommon('loading')}</p>
    </div>
  )
}
