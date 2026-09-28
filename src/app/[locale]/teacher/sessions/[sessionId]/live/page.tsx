'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useSocket } from '@/hooks/use-socket'
import type {
  SessionStatePayload,
  AnswerReceivedPayload,
  QuestionEndedPayload,
  SessionResultsPayload,
} from '@/lib/socket/events'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/cn'
import {
  Copy,
  Check,
  Play,
  SkipForward,
  Square,
  Users,
  Trophy,
  CheckCircle,
  Wifi,
  WifiOff,
  Pause,
  QrCode,
} from 'lucide-react'

type LivePhase = 'loading' | 'waiting' | 'active' | 'results'

export default function TeacherLiveSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const t = useTranslations('sessions')
  const tGames = useTranslations('games')
  const tCommon = useTranslations('common')
  const tClass = useTranslations('classroom')

  const { emit, on, isConnected } = useSocket()

  const [phase, setPhase] = useState<LivePhase>('loading')
  const [sessionState, setSessionState] = useState<SessionStatePayload | null>(null)
  const [answers, setAnswers] = useState<AnswerReceivedPayload[]>([])
  const [questionEnded, setQuestionEnded] = useState<QuestionEndedPayload | null>(null)
  const [results, setResults] = useState<SessionResultsPayload | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showQr, setShowQr] = useState(false)

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
        if (data.status === 'waiting') setPhase('waiting')
        else if (data.status === 'active' || data.status === 'paused') setPhase('active')
        else if (data.status === 'completed') setPhase('results')
      })
    )

    unsubs.push(
      on('answer:received', (data) => {
        setAnswers((prev) => [...prev, data])
      })
    )

    unsubs.push(
      on('question:ended', (data) => {
        setQuestionEnded(data)
      })
    )

    unsubs.push(
      on('session:results', (data) => {
        setResults(data)
        setPhase('results')
      })
    )

    return () => unsubs.forEach((fn) => fn())
  }, [on])

  const handleCopyCode = async () => {
    if (!sessionState) return
    await navigator.clipboard.writeText(sessionState.gameCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleStartSession = () => {
    setActionLoading(true)
    emit('teacher:start-session', { sessionId }, (res) => {
      setActionLoading(false)
      if (res.ok) {
        setAnswers([])
        setQuestionEnded(null)
      }
    })
  }

  const handleNextQuestion = () => {
    setActionLoading(true)
    setAnswers([])
    setQuestionEnded(null)
    emit('teacher:next-question', { sessionId }, () => {
      setActionLoading(false)
    })
  }

  const handlePause = () => {
    emit('teacher:pause-session', { sessionId }, () => {})
  }

  const handleResume = () => {
    emit('teacher:resume-session', { sessionId }, () => {})
  }

  const handleEndSession = () => {
    setActionLoading(true)
    emit('teacher:end-session', { sessionId }, () => {
      setActionLoading(false)
    })
  }

  const mode = sessionState?.mode || 'individual'
  const isTeam = mode === 'team'
  const participants = sessionState?.participants || []
  const teams = sessionState?.teams || []
  const connectedCount = participants.filter((p) => p.isConnected).length

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/ar/join`
    : ''

  // ---------- LOADING ----------
  if (phase === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
            <Spinner size="lg" />
          </div>
          <p className="mt-4 text-sm font-medium text-neutral-500">{tCommon('loading')}</p>
        </div>
      </div>
    )
  }

  // ---------- RESULTS ----------
  if (phase === 'results' && results) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50">
            <Trophy className="h-8 w-8 text-accent-500" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-neutral-900 tracking-tight">{tGames('results')}</h1>
          {mode !== 'individual' && (
            <Badge variant="info" className="mt-2">
              {mode === 'team' ? tClass('teamModeLabel') : tClass('individualModeLabel')}
            </Badge>
          )}
        </div>

        {/* Team Leaderboard */}
        {isTeam && results.teamLeaderboard && sessionState?.showLeaderboard && (
          <Card className="mx-auto max-w-lg">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">{tClass('teamResults')}</h2>
            <div className="space-y-2">
              {results.teamLeaderboard.map((team, i) => (
                <div
                  key={team.teamId}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                  style={{ backgroundColor: team.teamColor + '12' }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm" style={{ backgroundColor: team.teamColor }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium text-neutral-900">{team.teamName}</span>
                  <span className="text-lg font-bold" style={{ color: team.teamColor }}>
                    {team.totalScore}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Individual Leaderboard */}
        {results.leaderboard.length > 0 && sessionState?.showLeaderboard && (
          <Card className="mx-auto max-w-lg">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">{tGames('leaderboard')}</h2>
            <div className="space-y-2">
              {results.leaderboard.map((entry, i) => (
                <div
                  key={entry.studentId}
                  className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3"
                >
                  <span className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                    i === 0 ? 'bg-accent-100 text-accent-700' : i === 1 ? 'bg-neutral-200 text-neutral-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-500'
                  )}>
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium text-neutral-900">{entry.displayName}</span>
                  <span className="font-bold text-primary-600">
                    {entry.correctCount}/{entry.totalQuestions}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Question Stats */}
        <Card className="mx-auto max-w-lg">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('questionStats')}</h2>
          <div className="space-y-3">
            {results.questionResults.map((qr, i) => {
              const pct = qr.totalAnswers > 0 ? Math.round((qr.correctCount / qr.totalAnswers) * 100) : 0
              return (
                <div key={qr.questionId} className="rounded-xl bg-neutral-50 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-700 truncate pe-2">
                      Q{i + 1}: {qr.questionText}
                    </span>
                    <span className={cn(
                      'text-sm font-bold shrink-0',
                      pct >= 70 ? 'text-success-600' : pct >= 40 ? 'text-warning-600' : 'text-danger-600'
                    )}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        pct >= 70 ? 'bg-success-500' : pct >= 40 ? 'bg-warning-500' : 'bg-danger-500'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    )
  }

  // ---------- WAITING ----------
  if (phase === 'waiting' && sessionState) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('waitingRoom')}</h1>
          <p className="mt-1.5 text-sm text-neutral-500">{t('shareCode')}</p>
          {mode !== 'individual' && (
            <Badge variant="info" className="mt-2">
              {mode === 'team' ? tClass('teamModeLabel') : tClass('teacherLedMode')}
            </Badge>
          )}
        </div>

        {/* Game Code + QR */}
        <Card className="mx-auto max-w-md text-center !rounded-2xl !border-primary-100 bg-gradient-to-b from-primary-50/30 to-white">
          <p className="text-sm font-medium text-neutral-500 mb-3">{t('gameCode')}</p>
          <div className="flex items-center justify-center gap-3">
            <span
              dir="ltr"
              className="text-5xl font-mono font-bold tracking-[0.3em] text-primary-600 sm:text-6xl"
            >
              {sessionState.gameCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
              aria-label="Copy code"
            >
              {copiedCode ? (
                <Check className="h-5 w-5 text-success-500" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* QR Code toggle */}
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            <QrCode className="h-4 w-4" />
            {tClass('scanToJoin')}
          </button>

          {showQr && (
            <div className="mt-3 flex flex-col items-center">
              <div className="rounded-xl bg-white p-4 shadow-sm border">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`}
                  alt="QR Code"
                  className="h-48 w-48"
                  width={200}
                  height={200}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-400">{tClass('orEnterCode')}: {sessionState.gameCode}</p>
            </div>
          )}
        </Card>

        {/* Teams display (team mode) */}
        {isTeam && teams.length > 0 && (
          <Card className="mx-auto max-w-md">
            <h2 className="mb-3 font-semibold text-neutral-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-neutral-500" />
              {tClass('teams')}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {teams.map((team) => {
                const teamMembers = participants.filter((p) => p.teamId === team.id)
                return (
                  <div
                    key={team.id}
                    className="rounded-xl border-2 p-3 text-center transition-shadow hover:shadow-sm"
                    style={{ borderColor: team.color, backgroundColor: team.color + '10' }}
                  >
                    <p className="font-semibold" style={{ color: team.color }}>{team.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {tClass('teamMembers', { count: teamMembers.length })}
                    </p>
                    {teamMembers.map((m) => (
                      <p key={m.studentId} className="text-xs text-neutral-600 truncate">{m.displayName}</p>
                    ))}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Joined Students */}
        <Card className="mx-auto max-w-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-neutral-500" />
              {t('joinedStudents')}
            </h2>
            <Badge variant="info">{connectedCount}</Badge>
          </div>
          {participants.length === 0 ? (
            <div className="py-8 text-center">
              <Spinner size="sm" />
              <p className="mt-2 text-sm text-neutral-500">{t('waitingForStudents')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((p) => (
                <div
                  key={p.studentId}
                  className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2.5"
                >
                  {p.isConnected ? (
                    <Wifi className="h-4 w-4 text-success-500 shrink-0" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-neutral-400 shrink-0" />
                  )}
                  <span className="font-medium text-neutral-800">{p.displayName}</span>
                  {isTeam && p.teamId && (
                    <Badge variant="neutral" size="sm">
                      {teams.find((t) => t.id === p.teamId)?.name || ''}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Start Button */}
        <div className="mx-auto max-w-md">
          <Button
            size="lg"
            className="w-full text-lg"
            onClick={handleStartSession}
            loading={actionLoading}
            disabled={connectedCount === 0}
          >
            <Play className="h-5 w-5" />
            {t('startGame')}
          </Button>
        </div>
      </div>
    )
  }

  // ---------- ACTIVE ----------
  if (phase === 'active' && sessionState) {
    const currentQ = sessionState.currentQuestionIndex + 1
    const totalQ = sessionState.totalQuestions
    const answeredCount = answers.length
    const isPaused = sessionState.status === 'paused'

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              {t('question')} {currentQ} / {totalQ}
            </h1>
            <p className="text-sm text-neutral-500">
              {t('answersReceived', { count: answeredCount, total: connectedCount })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mode !== 'individual' && (
              <Badge variant="neutral" size="sm">
                {mode === 'team' ? tClass('teamModeLabel') : tClass('individualModeLabel')}
              </Badge>
            )}
            <Badge variant="info">
              <Users className="me-1 h-3 w-3" />
              {connectedCount}
            </Badge>
            <Badge variant={isPaused ? 'warning' : 'success'}>
              {isPaused ? tClass('pause') : t('live')}
            </Badge>
          </div>
        </div>

        {/* Team Scores (team mode) */}
        {isTeam && sessionState.showLeaderboard && teams.length > 0 && (
          <Card>
            <h2 className="mb-3 font-semibold text-neutral-900">{tClass('teamScore')}</h2>
            <div className="flex flex-wrap gap-3">
              {[...teams].sort((a, b) => b.score - a.score).map((team, i) => (
                <div
                  key={team.id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ backgroundColor: team.color + '15' }}
                >
                  <span className="text-lg font-bold" style={{ color: team.color }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="font-medium text-sm">{team.name}</span>
                  <span className="font-bold text-sm" style={{ color: team.color }}>
                    {team.score}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Answer Progress */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">{t('answerProgress')}</h2>
            <span className="text-sm font-medium text-primary-600">
              {answeredCount}/{connectedCount}
            </span>
          </div>
          <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-primary-500 to-primary-400 transition-all duration-500"
              style={{
                width: connectedCount > 0 ? `${(answeredCount / connectedCount) * 100}%` : '0%',
              }}
            />
          </div>

          {answers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {answers.map((a) => (
                <Badge key={`${a.studentId}-${a.questionId}`} variant="success" size="sm">
                  <CheckCircle className="me-1 h-3 w-3" />
                  {a.displayName}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Question ended stats */}
        {questionEnded && (
          <Card className="animate-slideUp">
            <h2 className="mb-4 font-semibold text-neutral-900">{t('questionResults')}</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div className="rounded-xl bg-success-50 py-3">
                <p className="text-2xl font-bold text-success-600">
                  {questionEnded.stats.correctCount}
                </p>
                <p className="text-xs font-medium text-success-600/70">{tGames('correct')}</p>
              </div>
              <div className="rounded-xl bg-danger-50 py-3">
                <p className="text-2xl font-bold text-danger-600">
                  {questionEnded.stats.totalAnswers - questionEnded.stats.correctCount}
                </p>
                <p className="text-xs font-medium text-danger-600/70">{tGames('wrong')}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 py-3">
                <p className="text-2xl font-bold text-neutral-600">
                  {questionEnded.stats.averageTime > 0
                    ? `${(questionEnded.stats.averageTime / 1000).toFixed(1)}s`
                    : '—'}
                </p>
                <p className="text-xs font-medium text-neutral-500">{t('avgTime')}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {isPaused ? (
            <Button size="lg" className="flex-1 min-w-[120px]" onClick={handleResume}>
              <Play className="h-5 w-5" />
              {tClass('resume')}
            </Button>
          ) : (
            <Button size="lg" variant="outline" onClick={handlePause}>
              <Pause className="h-5 w-5" />
              {tClass('pause')}
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1 min-w-[120px]"
            onClick={handleNextQuestion}
            loading={actionLoading}
          >
            <SkipForward className="h-5 w-5" />
            {currentQ >= totalQ ? tGames('results') : tGames('nextQuestion')}
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={handleEndSession}
            loading={actionLoading}
          >
            <Square className="h-5 w-5" />
            {t('endSession')}
          </Button>
        </div>
      </div>
    )
  }

  // Fallback loading
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
