'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import {
  Radio,
  PlusCircle,
  Users,
  Copy,
  Check,
  Monitor,
  UserCircle,
  ArrowLeft,
  Clock,
  Play,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const statusBadge: Record<string, { variant: 'warning' | 'success' | 'neutral'; label: string }> = {
  waiting: { variant: 'warning', label: 'waiting' },
  active: { variant: 'success', label: 'active' },
  paused: { variant: 'warning', label: 'paused' },
  completed: { variant: 'neutral', label: 'completed' },
}

const MODE_ICONS: Record<string, typeof Monitor> = {
  teacher_led: Monitor,
  team: Users,
  individual: UserCircle,
}

type SessionMode = 'individual' | 'teacher_led' | 'team'
type DialogStep = 'select' | 'mode' | 'config'

export default function TeacherSessionsPage() {
  const t = useTranslations('sessions')
  const tCommon = useTranslations('common')
  const tClass = useTranslations('classroom')
  const router = useRouter()

  const { data: sessions, error, isLoading, mutate } = useSWR('/api/sessions', fetcher)
  const { data: activities } = useSWR('/api/activities', fetcher)
  const { data: classes } = useSWR('/api/classes', fetcher)

  const [showDialog, setShowDialog] = useState(false)
  const [dialogStep, setDialogStep] = useState<DialogStep>('select')
  const [selectedActivity, setSelectedActivity] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedMode, setSelectedMode] = useState<SessionMode>('individual')
  const [teamCount, setTeamCount] = useState(4)
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const resetDialog = () => {
    setShowDialog(false)
    setDialogStep('select')
    setSelectedActivity('')
    setSelectedClass('')
    setSelectedMode('individual')
    setTeamCount(4)
    setShowLeaderboard(true)
  }

  const handleCreate = async () => {
    if (!selectedActivity || !selectedClass) return
    setCreating(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: selectedActivity,
          classId: selectedClass,
          mode: selectedMode,
          showLeaderboard,
          ...(selectedMode === 'team' ? { teamCount } : {}),
        }),
      })
      if (!res.ok) throw new Error('Failed to create session')
      const session = await res.json()
      resetDialog()
      mutate()
      if (selectedMode === 'teacher_led') {
        router.push(`/teacher/sessions/${session.id}/projector`)
      } else {
        router.push(`/teacher/sessions/${session.id}/live`)
      }
    } catch {
      // stay on dialog
    } finally {
      setCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={<Radio className="h-8 w-8" />}
          title={tCommon('error')}
        />
      </div>
    )
  }

  const sessionList = sessions || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('mySessions')}</h1>
        <Button onClick={() => setShowDialog(true)}>
          <Play className="h-4 w-4" />
          {t('createSession')}
        </Button>
      </div>

      {sessionList.length === 0 ? (
        <EmptyState
          icon={<Radio className="h-8 w-8" />}
          title={t('noSessions')}
          description={t('noSessionsDescription')}
          action={
            <Button onClick={() => setShowDialog(true)}>
              <PlusCircle className="h-4 w-4" />
              {t('createSession')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessionList.map((session: any, index: number) => {
            const badge = statusBadge[session.status] || statusBadge.completed
            const isLive = session.status === 'waiting' || session.status === 'active' || session.status === 'paused'
            const ModeIcon = MODE_ICONS[session.mode] || UserCircle

            const modeLabel = session.mode === 'teacher_led' ? tClass('teacherLed')
              : session.mode === 'team' ? tClass('teamMode')
              : tClass('individualMode')

            return (
              <div
                key={session.id}
                className="animate-slideUp"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <Card
                  hover
                  className={cn(
                    'cursor-pointer',
                    isLive && 'border-primary-200/80 ring-1 ring-primary-100',
                  )}
                  onClick={() => {
                    if (isLive && session.mode === 'teacher_led') router.push(`/teacher/sessions/${session.id}/projector`)
                    else if (isLive) router.push(`/teacher/sessions/${session.id}/live`)
                    else if (session.status === 'completed') router.push(`/teacher/sessions/${session.id}/results`)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-neutral-900 truncate">
                        {session.activity?.titleAr || session.activity?.title || '—'}
                      </h3>
                      <p className="mt-0.5 text-sm text-neutral-500 truncate">
                        {session.class?.name || '—'}
                      </p>
                    </div>
                    <Badge variant={badge.variant}>{t(badge.label)}</Badge>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {session._count?.participants ?? 0}
                    </span>
                    <span className="text-neutral-300">&middot;</span>
                    <span className="flex items-center gap-1.5">
                      <ModeIcon className="h-3.5 w-3.5" />
                      {modeLabel}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="rounded-lg bg-neutral-100 px-2.5 py-1 text-sm font-mono font-semibold text-primary-600">
                        {session.code}
                      </code>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyCode(session.code)
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                        aria-label="Copy"
                      >
                        {copiedCode === session.code ? (
                          <Check className="h-3.5 w-3.5 text-success-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-neutral-400">
                      <Clock className="h-3 w-3" />
                      {new Date(session.createdAt).toLocaleDateString('ar-TN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Session Dialog ───────────────────────────────── */}
      <Dialog
        open={showDialog}
        onClose={resetDialog}
        title={
          dialogStep === 'mode'
            ? tClass('selectMode')
            : dialogStep === 'config'
              ? tClass('teamConfig') || tClass('teamMode')
              : t('createSession')
        }
        size="lg"
        actions={
          <>
            {dialogStep === 'mode' ? (
              <Button variant="outline" onClick={() => setDialogStep('select')}>
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {tCommon('back')}
              </Button>
            ) : dialogStep === 'config' ? (
              <Button variant="outline" onClick={() => setDialogStep('mode')}>
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {tCommon('back')}
              </Button>
            ) : (
              <Button variant="outline" onClick={resetDialog}>
                {tCommon('cancel')}
              </Button>
            )}
            {dialogStep === 'select' && (
              <Button
                onClick={() => setDialogStep('mode')}
                disabled={!selectedActivity || !selectedClass}
              >
                {tCommon('next')}
              </Button>
            )}
            {dialogStep === 'mode' && (
              <Button onClick={() => {
                if (selectedMode === 'team') setDialogStep('config')
                else handleCreate()
              }} loading={creating}>
                {selectedMode === 'team' ? tCommon('next') : t('launch')}
              </Button>
            )}
            {dialogStep === 'config' && (
              <Button onClick={handleCreate} loading={creating}>
                <Play className="h-4 w-4" />
                {t('launch')}
              </Button>
            )}
          </>
        }
      >
        {/* Stepper indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['select', 'mode', 'config'] as DialogStep[]).map((step, i) => {
            const stepIndex = ['select', 'mode', 'config'].indexOf(dialogStep)
            const isActive = step === dialogStep
            const isPast = i < stepIndex
            return (
              <div key={step} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={cn('h-px w-8', isPast || isActive ? 'bg-primary-400' : 'bg-neutral-200')} />
                )}
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isActive ? 'bg-primary-600 text-white' :
                  isPast ? 'bg-primary-100 text-primary-600' :
                  'bg-neutral-100 text-neutral-400',
                )}>
                  {i + 1}
                </div>
              </div>
            )
          })}
        </div>

        {dialogStep === 'select' && (
          <div className="space-y-4">
            <Select
              label={t('selectActivity')}
              placeholder={t('selectActivityPlaceholder')}
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              options={
                (activities || []).map((a: any) => ({
                  value: a.id,
                  label: a.titleAr || a.title,
                }))
              }
            />
            <Select
              label={t('selectClass')}
              placeholder={t('selectClassPlaceholder')}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              options={
                (classes || []).map((c: any) => ({
                  value: c.id,
                  label: c.name,
                }))
              }
            />
          </div>
        )}

        {dialogStep === 'mode' && (
          <div className="space-y-3">
            {([
              { mode: 'teacher_led' as SessionMode, icon: Monitor, title: tClass('teacherLed'), desc: tClass('teacherLedDesc'), sub: tClass('noDevicesNeeded'), color: 'primary' as const },
              { mode: 'team' as SessionMode, icon: Users, title: tClass('teamMode'), desc: tClass('teamModeDesc'), sub: tClass('sharedDevices'), color: 'accent' as const },
              { mode: 'individual' as SessionMode, icon: UserCircle, title: tClass('individualMode'), desc: tClass('individualModeDesc'), sub: tClass('personalDevices'), color: 'info' as const },
            ]).map(({ mode, icon: Icon, title, desc, sub, color }) => {
              const isSelected = selectedMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedMode(mode)}
                  className={cn(
                    'w-full rounded-2xl border-2 px-4 py-4 text-start transition-all',
                    isSelected
                      ? 'border-primary-500 bg-primary-50/60 shadow-sm shadow-primary-500/10'
                      : 'border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                      isSelected
                        ? `bg-${color}-100 text-${color}-600`
                        : 'bg-neutral-100 text-neutral-500',
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-neutral-900">{title}</p>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-primary-500" />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-neutral-500">{desc}</p>
                      <p className="mt-1 text-xs text-neutral-400">{sub}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {dialogStep === 'config' && selectedMode === 'team' && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                {tClass('teamCount')}
              </label>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTeamCount(n)}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold transition-all',
                      teamCount === n
                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50 transition-colors">
              <input
                type="checkbox"
                checked={showLeaderboard}
                onChange={(e) => setShowLeaderboard(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-neutral-700">{tClass('showLeaderboard')}</span>
            </label>
          </div>
        )}
      </Dialog>
    </div>
  )
}
