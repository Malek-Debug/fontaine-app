'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

interface TrueFalseRendererProps {
  phase: 'playing' | 'answered' | 'review'
  endedData: { correctAnswer: string } | null
  onAnswer: (answerJson: string) => void
  disabled: boolean
}

export function TrueFalseRenderer({ phase, endedData, onAnswer, disabled }: TrueFalseRendererProps) {
  const [selected, setSelected] = useState<boolean | null>(null)

  let correctAnswer: boolean | null = null
  if (phase === 'review' && endedData) {
    try {
      correctAnswer = JSON.parse(endedData.correctAnswer).correctAnswer
    } catch {}
  }

  const handleSelect = (value: boolean) => {
    if (disabled || selected !== null) return
    setSelected(value)
    onAnswer(JSON.stringify({ selectedAnswer: value }))
  }

  const getButtonClass = (value: boolean) => {
    const isSelected = selected === value
    const isCorrectRevealed = phase === 'review' && correctAnswer === value
    const isWrongRevealed = phase === 'review' && isSelected && correctAnswer !== value

    if (phase === 'review') {
      if (isCorrectRevealed) return 'bg-emerald-500 ring-4 ring-emerald-300 text-white'
      if (isWrongRevealed) return 'bg-rose-500 opacity-75 text-white'
      return 'bg-neutral-200 text-neutral-500'
    }

    if (isSelected) {
      return value
        ? 'bg-emerald-500 ring-4 ring-white/50 scale-[0.97] text-white'
        : 'bg-rose-500 ring-4 ring-white/50 scale-[0.97] text-white'
    }

    return value
      ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white'
      : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white'
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => handleSelect(true)}
        disabled={disabled || selected !== null || phase !== 'playing'}
        className={cn(
          'flex min-h-[100px] flex-col items-center justify-center gap-3 rounded-2xl px-6 py-6',
          'text-xl font-bold transition-all duration-150 disabled:cursor-default shadow-sm active:scale-[0.97]',
          getButtonClass(true)
        )}
      >
        <CheckCircle className="h-10 w-10" />
        <span>صحيح</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelect(false)}
        disabled={disabled || selected !== null || phase !== 'playing'}
        className={cn(
          'flex min-h-[100px] flex-col items-center justify-center gap-3 rounded-2xl px-6 py-6',
          'text-xl font-bold transition-all duration-150 disabled:cursor-default shadow-sm active:scale-[0.97]',
          getButtonClass(false)
        )}
      >
        <XCircle className="h-10 w-10" />
        <span>خطأ</span>
      </button>
    </div>
  )
}
