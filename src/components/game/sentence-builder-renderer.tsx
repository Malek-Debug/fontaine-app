'use client'

import { useState } from 'react'
import { CheckCircle, RotateCcw } from 'lucide-react'

interface SentenceBuilderRendererProps {
  data: string
  phase: 'playing' | 'answered' | 'review'
  endedData: { correctAnswer: string } | null
  onAnswer: (answerJson: string) => void
  disabled: boolean
}

export function SentenceBuilderRenderer({ data, phase, endedData, onAnswer, disabled }: SentenceBuilderRendererProps) {
  const [orderedWords, setOrderedWords] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  let words: string[] = []
  let hint: string | undefined
  try {
    const parsed = JSON.parse(data)
    words = parsed.words || []
    hint = parsed.hint
  } catch {
    return null
  }

  let correctOrder: string[] | null = null
  if (phase === 'review' && endedData) {
    try {
      correctOrder = JSON.parse(endedData.correctAnswer).correctOrder
    } catch {}
  }

  const availableWords = words.filter((w) => {
    const usedCount = orderedWords.filter((ow) => ow === w).length
    const totalCount = words.filter((tw) => tw === w).length
    return usedCount < totalCount
  })

  const handleWordTap = (word: string) => {
    if (disabled || submitted || phase !== 'playing') return
    const newOrdered = [...orderedWords, word]
    setOrderedWords(newOrdered)

    if (newOrdered.length === words.length) {
      setSubmitted(true)
      onAnswer(JSON.stringify({ orderedWords: newOrdered }))
    }
  }

  const handleRemoveWord = (index: number) => {
    if (disabled || submitted || phase !== 'playing') return
    setOrderedWords((prev) => prev.filter((_, i) => i !== index))
  }

  const handleReset = () => {
    if (disabled || submitted || phase !== 'playing') return
    setOrderedWords([])
  }

  return (
    <div className="space-y-6">
      {hint && phase === 'playing' && (
        <p className="text-center text-sm text-neutral-500">{hint}</p>
      )}

      <div className={`
        min-h-[80px] rounded-2xl border-2 border-dashed p-4
        ${phase === 'review' && correctOrder
          ? JSON.stringify(orderedWords) === JSON.stringify(correctOrder)
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-rose-400 bg-rose-50'
          : 'border-neutral-300 bg-neutral-50'}
      `}>
        {orderedWords.length === 0 ? (
          <p className="text-center text-neutral-400">اضغط على الكلمات لتكوين الجملة</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {orderedWords.map((word, i) => (
              <button
                key={`${word}-${i}`}
                type="button"
                onClick={() => handleRemoveWord(i)}
                disabled={disabled || submitted || phase !== 'playing'}
                className="min-h-[44px] rounded-lg bg-primary-500 px-4 py-2 text-base font-semibold text-white transition-all hover:bg-primary-600 active:scale-95 disabled:cursor-default"
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>

      {phase === 'review' && correctOrder && JSON.stringify(orderedWords) !== JSON.stringify(correctOrder) && (
        <div className="rounded-xl bg-success-50 border border-success-200 p-3">
          <p className="mb-1 text-xs font-medium text-success-700">الجملة الصحيحة:</p>
          <p className="text-base font-semibold text-success-800" dir="rtl">{correctOrder.join(' ')}</p>
        </div>
      )}

      {phase === 'review' && correctOrder && JSON.stringify(orderedWords) === JSON.stringify(correctOrder) && (
        <div className="flex items-center justify-center gap-2 text-success-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-semibold">إجابة صحيحة!</span>
        </div>
      )}

      {phase === 'playing' && !submitted && (
        <>
          <div className="flex flex-wrap gap-2 justify-center">
            {availableWords.map((word, i) => (
              <button
                key={`avail-${word}-${i}`}
                type="button"
                onClick={() => handleWordTap(word)}
                disabled={disabled}
                className="min-h-[48px] rounded-xl border-2 border-neutral-300 bg-white px-5 py-3 text-base font-semibold text-neutral-800 transition-all hover:border-primary-400 hover:bg-primary-50 active:scale-95"
              >
                {word}
              </button>
            ))}
          </div>

          {orderedWords.length > 0 && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                إعادة
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
