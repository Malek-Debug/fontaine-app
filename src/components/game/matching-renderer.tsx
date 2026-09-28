'use client'

import { useState } from 'react'
import { CheckCircle, Link } from 'lucide-react'

const PAIR_COLORS = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-green-100 border-green-400 text-green-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-orange-100 border-orange-400 text-orange-800',
  'bg-pink-100 border-pink-400 text-pink-800',
  'bg-teal-100 border-teal-400 text-teal-800',
  'bg-indigo-100 border-indigo-400 text-indigo-800',
  'bg-yellow-100 border-yellow-400 text-yellow-800',
]

interface MatchingRendererProps {
  data: string
  phase: 'playing' | 'answered' | 'review'
  endedData: { correctAnswer: string } | null
  onAnswer: (answerJson: string) => void
  disabled: boolean
}

export function MatchingRenderer({ data, phase, endedData, onAnswer, disabled }: MatchingRendererProps) {
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  let leftItems: Array<{ id: string; left: string }> = []
  let shuffledRights: string[] = []
  try {
    const parsed = JSON.parse(data)
    leftItems = parsed.pairs || []
    shuffledRights = parsed.shuffledRights || []
  } catch {
    return null
  }

  let correctPairs: Record<string, string> | null = null
  if (phase === 'review' && endedData) {
    try {
      correctPairs = JSON.parse(endedData.correctAnswer).pairs
    } catch {}
  }

  const usedRights = new Set(Object.values(matchedPairs))
  const availableRights = shuffledRights.filter((r) => !usedRights.has(r))

  const handleLeftTap = (id: string) => {
    if (disabled || submitted || phase !== 'playing') return
    if (matchedPairs[id]) {
      const newPairs = { ...matchedPairs }
      delete newPairs[id]
      setMatchedPairs(newPairs)
      setSelectedLeftId(null)
      return
    }
    setSelectedLeftId(selectedLeftId === id ? null : id)
  }

  const handleRightTap = (right: string) => {
    if (disabled || submitted || phase !== 'playing' || !selectedLeftId) return
    const newPairs = { ...matchedPairs, [selectedLeftId]: right }
    setMatchedPairs(newPairs)
    setSelectedLeftId(null)

    if (Object.keys(newPairs).length === leftItems.length) {
      setSubmitted(true)
      onAnswer(JSON.stringify({ pairs: newPairs }))
    }
  }

  const getColorForPair = (id: string) => {
    const idx = leftItems.findIndex((item) => item.id === id)
    return PAIR_COLORS[idx % PAIR_COLORS.length]
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {leftItems.map((item) => {
          const matched = matchedPairs[item.id]
          const isSelected = selectedLeftId === item.id
          const isCorrect = phase === 'review' && correctPairs && matched === correctPairs[item.id]
          const isWrong = phase === 'review' && correctPairs && matched && matched !== correctPairs[item.id]

          return (
            <div key={item.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleLeftTap(item.id)}
                disabled={disabled || submitted || phase !== 'playing'}
                className={`
                  min-h-[52px] flex-1 rounded-xl border-2 px-4 py-3 text-start font-medium transition-all
                  ${isSelected ? 'border-primary-500 bg-primary-50 text-primary-700' : ''}
                  ${matched && !isSelected ? `border-2 ${getColorForPair(item.id)}` : ''}
                  ${!matched && !isSelected ? 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300' : ''}
                  ${phase === 'review' && isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : ''}
                  ${phase === 'review' && isWrong ? 'border-rose-500 bg-rose-50 text-rose-800' : ''}
                  disabled:cursor-default
                `}
              >
                {item.left}
              </button>

              <Link className="h-4 w-4 shrink-0 text-neutral-300" />

              <div className={`
                min-h-[52px] flex-1 rounded-xl border-2 px-4 py-3 text-start font-medium
                ${matched ? getColorForPair(item.id) : 'border-dashed border-neutral-300 bg-neutral-50 text-neutral-400'}
                ${phase === 'review' && isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : ''}
                ${phase === 'review' && isWrong ? 'border-rose-500 bg-rose-50 text-rose-800' : ''}
              `}>
                {matched || '...'}
                {phase === 'review' && isCorrect && <CheckCircle className="inline-block ms-2 h-4 w-4 text-emerald-500" />}
                {phase === 'review' && isWrong && (
                  <span className="ms-2 text-sm text-emerald-600">← {correctPairs?.[item.id]}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!submitted && availableRights.length > 0 && phase === 'playing' && (
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-500">اختر من هنا:</p>
          <div className="flex flex-wrap gap-2">
            {availableRights.map((right, i) => (
              <button
                key={`${right}-${i}`}
                type="button"
                onClick={() => handleRightTap(right)}
                disabled={disabled || !selectedLeftId}
                className={`
                  min-h-[44px] rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all
                  ${selectedLeftId
                    ? 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100'
                    : 'border-neutral-200 bg-white text-neutral-600 cursor-default opacity-60'}
                `}
              >
                {right}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
