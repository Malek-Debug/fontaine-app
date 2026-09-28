'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { Droplets, ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

const VALID_CHARS = new Set('ABCDEFGHJKMNPQRSTUVWXYZ23456789'.split(''))

export default function JoinPage() {
  const t = useTranslations('games')
  const tCommon = useTranslations('common')
  const router = useRouter()

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [selectingStudent, setSelectingStudent] = useState(false)

  const handleCodeChange = (value: string) => {
    const filtered = value
      .toUpperCase()
      .split('')
      .filter((ch) => VALID_CHARS.has(ch))
      .join('')
      .slice(0, 6)
    setCode(filtered)
    setError('')
  }

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError(t('codeLength'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${code}`)
      if (!res.ok) {
        setError(t('invalidCode'))
        return
      }
      const data = await res.json()
      if (data.status === 'completed') {
        setError(t('sessionEnded'))
        return
      }
      setSession(data)
      setSelectingStudent(true)
    } catch {
      setError(t('invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStudent = (studentId: string) => {
    router.push(`/join/${code}?student=${studentId}`)
  }

  /* ── Student selection screen ─────────────────────────── */
  if (selectingStudent && session) {
    const students = session.class?.students || []
    const joinedIds = new Set(
      (session.participants || []).map((p: any) => p.studentId),
    )

    return (
      <div className="flex min-h-screen flex-col items-center px-4 pt-10 pb-8">
        {/* Brand */}
        <div className="mb-8 text-center animate-fadeIn">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20">
            <Droplets className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-neutral-900 tracking-tight">
            {t('selectName')}
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            {session.activity?.titleAr || session.activity?.title}
          </p>
        </div>

        {/* Student list */}
        <div className="w-full max-w-sm space-y-2.5">
          {students.map((student: any, i: number) => {
            const alreadyJoined = joinedIds.has(student.id)
            return (
              <button
                key={student.id}
                type="button"
                disabled={alreadyJoined}
                onClick={() => handleSelectStudent(student.id)}
                className={cn(
                  'animate-slideUp w-full rounded-2xl px-5 py-4 text-start transition-all',
                  i <= 5 && `animate-stagger-${Math.min(i + 1, 5)}`,
                  alreadyJoined
                    ? 'bg-neutral-100 cursor-not-allowed'
                    : 'bg-white border-2 border-neutral-200 hover:border-primary-400 hover:shadow-md hover:shadow-primary-500/10 active:scale-[0.98]',
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={cn(
                      'block text-lg font-semibold',
                      alreadyJoined ? 'text-neutral-400' : 'text-neutral-900',
                    )}>
                      {student.displayName}
                    </span>
                    <span className={cn(
                      'block text-sm',
                      alreadyJoined ? 'text-neutral-300' : 'text-neutral-400',
                    )}>
                      {student.firstName} {student.lastName}
                    </span>
                  </div>
                  {alreadyJoined && (
                    <div className="flex items-center gap-1.5 rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-500">
                      <Check className="h-3 w-3" />
                      {t('alreadyJoined')}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => { setSelectingStudent(false); setSession(null) }}
          className="mt-8 flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {tCommon('back')}
        </button>
      </div>
    )
  }

  /* ── Code entry screen ────────────────────────────────── */
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center animate-fadeIn">
        {/* Brand */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20">
          <Droplets className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-neutral-900">Fontaine</h1>
        <p className="mt-2 text-base text-neutral-500">{t('enterCode')}</p>

        {/* Code input */}
        <div className="mt-8">
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) handleJoin() }}
            placeholder="XXXXXX"
            dir="ltr"
            className={cn(
              'w-full rounded-2xl border-2 bg-white px-6 py-5 text-center',
              'text-3xl font-mono font-bold tracking-[0.3em] text-neutral-900',
              'placeholder:text-neutral-300 placeholder:tracking-[0.3em]',
              'transition-all focus:outline-none focus:ring-4',
              error
                ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/20'
                : 'border-neutral-200 focus:border-primary-500 focus:ring-primary-500/20',
            )}
            maxLength={6}
          />
          {error && (
            <p className="mt-2.5 text-sm font-medium text-danger-500 animate-slideUp">{error}</p>
          )}
        </div>

        {/* Join button */}
        <div className="mt-6">
          <Button
            size="lg"
            onClick={handleJoin}
            loading={loading}
            disabled={code.length !== 6}
            className="w-full text-lg rounded-2xl h-14"
          >
            {loading ? <Spinner size="sm" className="text-white" /> : t('join')}
          </Button>
        </div>

        {/* Code length hint */}
        <div className="mt-4 flex justify-center gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 w-6 rounded-full transition-colors duration-200',
                i < code.length ? 'bg-primary-500' : 'bg-neutral-200',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
