'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import {
  MessageCircle,
  Send,
  Sparkles,
  AlertCircle,
  Bot,
  User,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function AiChatPage() {
  const t = useTranslations('ai')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: aiStatus } = useSWR('/api/ai/status', fetcher)
  const { data: classesData } = useSWR('/api/classes', fetcher)
  const classes = classesData?.classes || classesData || []

  const { data: curriculumData } = useSWR('/api/curriculum', fetcher)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          classId: selectedClassId || undefined,
          skillId: selectedSkillId || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 429) {
          setError(t('rateLimited'))
        } else if (res.status === 504) {
          setError(t('timeout'))
        } else {
          setError(data.message || t('generationFailed'))
        }
        return
      }

      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data?.message?.content || data?.content || '' },
      ])
    } catch {
      setError(t('generationFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const skills: { id: string; nameAr: string }[] = []
  if (curriculumData?.grades) {
    for (const grade of curriculumData.grades) {
      for (const subject of grade.subjects || []) {
        for (const unit of subject.units || []) {
          for (const domain of unit.domains || []) {
            for (const lesson of domain.lessons || []) {
              for (const skill of lesson.skills || []) {
                skills.push({ id: skill.id, nameAr: skill.nameAr })
              }
            }
          }
        }
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              {t('teacherChat')}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" size="sm">
            <Sparkles className="h-3 w-3 me-1" />
            AI
          </Badge>
          {aiStatus && (
            <Badge variant={aiStatus.available ? 'success' : 'warning'} size="sm">
              <span className={cn(
                'h-1.5 w-1.5 rounded-full me-1.5',
                aiStatus.available ? 'bg-success-400' : 'bg-warning-400'
              )} />
              {aiStatus.available
                ? aiStatus.providerType === 'ollama'
                  ? `${aiStatus.model}`
                  : aiStatus.providerType === 'mock'
                    ? 'تجريبي'
                    : aiStatus.provider
                : 'غير متصل'}
            </Badge>
          )}
        </div>
      </div>

      {/* Context Filters */}
      <div className="flex flex-wrap gap-2">
        {Array.isArray(classes) && classes.length > 0 && (
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-colors"
          >
            <option value="">كل الأقسام</option>
            {classes.map((cls: { id: string; name: string }) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        )}
        {skills.length > 0 && (
          <select
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 max-w-[220px] transition-colors"
          >
            <option value="">كل المهارات</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAr}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Chat Area */}
      <Card className="flex flex-1 flex-col overflow-hidden !p-0 !rounded-2xl border-neutral-200/80">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-400 mb-4">
                <Bot className="h-8 w-8" />
              </div>
              <p className="text-lg font-semibold text-neutral-900 mb-1">{t('chatWelcome')}</p>
              <p className="text-sm text-neutral-500 max-w-sm">
                يمكنك سؤالي عن التخطيط للدروس، إنشاء الأنشطة، أو تحليل أداء
                التلاميذ.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {[
                  'كيف أحسّن أداء التلاميذ في القراءة؟',
                  'اقترح نشاطًا لمهارة الإملاء',
                  'حلّل نتائج آخر حصة',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setInput(suggestion)
                      inputRef.current?.focus()
                    }}
                    className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-600 hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-700 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2.5',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap animate-slideUp',
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-ee-md shadow-sm shadow-primary-600/20'
                    : 'bg-neutral-100 text-neutral-900 rounded-es-md'
                )}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-neutral-100 rounded-2xl rounded-es-md px-4 py-3">
                <div className="flex items-center gap-2.5 text-sm text-neutral-500">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span>جارٍ التفكير...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center animate-fadeIn">
              <div className="flex items-center gap-2 rounded-xl bg-danger-50 border border-danger-200/60 px-4 py-2.5 text-sm text-danger-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-neutral-200/80 bg-white/80 backdrop-blur-sm p-3">
          <div className="flex items-end gap-2.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chatPlaceholder')}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 focus:bg-white transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all',
                input.trim() && !isLoading
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 active:scale-[0.96]'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              )}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
