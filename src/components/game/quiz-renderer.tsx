'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

const OPTION_COLORS = [
  'bg-rose-500 hover:bg-rose-600 active:bg-rose-700',
  'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
  'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700',
  'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
]

interface QuizRendererProps {
  data: string
  phase: 'playing' | 'answered' | 'review'
  endedData: { correctAnswer: string } | null
  onAnswer: (answerJson: string) => void
  disabled: boolean
}

export function QuizRenderer({ data, phase, endedData, onAnswer, disabled }: QuizRendererProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

  let options: Array<{ id: string; text: string }> = []
  try {
    const parsed = JSON.parse(data)
    options = parsed.options || []
  } catch {
    return null
  }

  let correctOptionId: string | null = null
  if (phase === 'review' && endedData) {
    try {
      correctOptionId = JSON.parse(endedData.correctAnswer).correctOptionId
    } catch {}
  }

  const handleSelect = (optionId: string) => {
    if (disabled || selectedOptionId) return
    setSelectedOptionId(optionId)
    onAnswer(JSON.stringify({ selectedOptionId: optionId }))
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option, i) => {
        const isSelected = selectedOptionId === option.id
        const isCorrectRevealed = phase === 'review' && correctOptionId === option.id
        const isWrongRevealed = phase === 'review' && isSelected && correctOptionId !== option.id

        let optionClass = OPTION_COLORS[i % OPTION_COLORS.length]

        if (phase === 'review') {
          if (isCorrectRevealed) {
            optionClass = 'bg-emerald-500 ring-4 ring-emerald-300'
          } else if (isWrongRevealed) {
            optionClass = 'bg-rose-500 opacity-75'
          } else {
            optionClass = 'bg-neutral-300'
          }
        } else if (isSelected) {
          optionClass += ' ring-4 ring-white/50 scale-[0.97]'
        }

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => handleSelect(option.id)}
            disabled={disabled || !!selectedOptionId || phase !== 'playing'}
            className={cn(
              'min-h-[72px] rounded-2xl px-5 py-4 text-start text-lg font-semibold text-white',
              'transition-all duration-150 disabled:cursor-default shadow-sm active:scale-[0.97]',
              optionClass
            )}
          >
            {option.text}
            {isCorrectRevealed && <CheckCircle className="inline-block ms-2 h-5 w-5" />}
            {isWrongRevealed && <XCircle className="inline-block ms-2 h-5 w-5" />}
          </button>
        )
      })}
    </div>
  )
}
