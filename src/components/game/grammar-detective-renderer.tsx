'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

const LABEL_COLORS = [
  'bg-blue-500 text-white',
  'bg-green-500 text-white',
  'bg-purple-500 text-white',
  'bg-orange-500 text-white',
  'bg-pink-500 text-white',
  'bg-teal-500 text-white',
  'bg-indigo-500 text-white',
]

interface GrammarDetectiveRendererProps {
  data: string
  phase: 'playing' | 'answered' | 'review'
  endedData: { correctAnswer: string } | null
  onAnswer: (answerJson: string) => void
  disabled: boolean
}

export function GrammarDetectiveRenderer({ data, phase, endedData, onAnswer, disabled }: GrammarDetectiveRendererProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [labelAssignments, setLabelAssignments] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  let sentence = ''
  let targets: Array<{ id: string; text: string; startIndex: number; endIndex: number }> = []
  let availableLabels: string[] = []
  try {
    const parsed = JSON.parse(data)
    sentence = parsed.sentence || ''
    targets = parsed.targets || []
    availableLabels = parsed.availableLabels || []
  } catch {
    return null
  }

  let correctLabels: Record<string, string> | null = null
  if (phase === 'review' && endedData) {
    try {
      correctLabels = JSON.parse(endedData.correctAnswer).labels
    } catch {}
  }

  const handleTargetTap = (id: string) => {
    if (disabled || submitted || phase !== 'playing') return
    setSelectedTargetId(selectedTargetId === id ? null : id)
  }

  const handleLabelTap = (label: string) => {
    if (disabled || submitted || phase !== 'playing' || !selectedTargetId) return
    const newAssignments = { ...labelAssignments, [selectedTargetId]: label }
    setLabelAssignments(newAssignments)
    setSelectedTargetId(null)

    if (Object.keys(newAssignments).length === targets.length) {
      setSubmitted(true)
      onAnswer(JSON.stringify({ labelAssignments: newAssignments }))
    }
  }

  const getLabelColor = (label: string) => {
    const idx = availableLabels.indexOf(label)
    return LABEL_COLORS[idx % LABEL_COLORS.length]
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-neutral-50 p-6 text-center" dir="rtl">
        <p className="text-xl leading-loose font-medium text-neutral-900">
          {targets.length > 0 ? renderSentenceWithTargets(sentence, targets, labelAssignments, correctLabels, selectedTargetId, phase, handleTargetTap, getLabelColor, disabled || submitted) : sentence}
        </p>
      </div>

      <div className="space-y-3">
        {targets.map((target) => {
          const assigned = labelAssignments[target.id]
          const isSelected = selectedTargetId === target.id
          const isCorrect = phase === 'review' && correctLabels && assigned === correctLabels[target.id]
          const isWrong = phase === 'review' && correctLabels && assigned && assigned !== correctLabels[target.id]

          return (
            <div key={target.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleTargetTap(target.id)}
                disabled={disabled || submitted || phase !== 'playing'}
                className={`
                  min-h-[44px] rounded-lg border-2 px-4 py-2 font-semibold transition-all
                  ${isSelected ? 'border-primary-500 bg-primary-50 text-primary-700' : ''}
                  ${!isSelected && !assigned ? 'border-neutral-300 bg-white text-neutral-800 hover:border-primary-300' : ''}
                  ${assigned && !isSelected ? 'border-neutral-200 bg-neutral-50 text-neutral-600' : ''}
                  disabled:cursor-default
                `}
              >
                {target.text}
              </button>

              <span className="text-neutral-300">←</span>

              {assigned ? (
                <span className={`
                  inline-flex min-h-[36px] items-center rounded-full px-4 py-1.5 text-sm font-semibold
                  ${phase === 'review' && isCorrect ? 'bg-emerald-500 text-white' : ''}
                  ${phase === 'review' && isWrong ? 'bg-rose-500 text-white' : ''}
                  ${phase !== 'review' ? getLabelColor(assigned) : ''}
                `}>
                  {assigned}
                  {phase === 'review' && isCorrect && <CheckCircle className="ms-1.5 h-4 w-4" />}
                  {phase === 'review' && isWrong && (
                    <span className="ms-2 text-xs">({correctLabels?.[target.id]})</span>
                  )}
                </span>
              ) : (
                <span className="text-sm text-neutral-400">...</span>
              )}
            </div>
          )
        })}
      </div>

      {phase === 'playing' && !submitted && selectedTargetId && (
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-500">اختر التصنيف:</p>
          <div className="flex flex-wrap gap-2">
            {availableLabels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => handleLabelTap(label)}
                disabled={disabled}
                className={`
                  min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold transition-all
                  active:scale-95 ${getLabelColor(label)} hover:opacity-90
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'playing' && !submitted && !selectedTargetId && Object.keys(labelAssignments).length < targets.length && (
        <p className="text-center text-sm text-neutral-400">اضغط على كلمة لتحديد تصنيفها</p>
      )}
    </div>
  )
}

function renderSentenceWithTargets(
  sentence: string,
  targets: Array<{ id: string; text: string; startIndex: number; endIndex: number }>,
  assignments: Record<string, string>,
  correctLabels: Record<string, string> | null,
  selectedTargetId: string | null,
  phase: string,
  onTap: (id: string) => void,
  getLabelColor: (label: string) => string,
  isDisabled: boolean,
) {
  const sorted = [...targets].sort((a, b) => a.startIndex - b.startIndex)
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  sorted.forEach((target) => {
    if (target.startIndex > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{sentence.slice(lastIndex, target.startIndex)}</span>
      )
    }

    const assigned = assignments[target.id]
    const isSelected = selectedTargetId === target.id
    const isCorrect = phase === 'review' && correctLabels && assigned === correctLabels[target.id]
    const isWrong = phase === 'review' && correctLabels && assigned && assigned !== correctLabels[target.id]

    parts.push(
      <button
        key={target.id}
        type="button"
        onClick={() => onTap(target.id)}
        disabled={isDisabled}
        className={`
          inline-block rounded-md px-1.5 py-0.5 font-bold underline decoration-2 underline-offset-4 transition-all
          ${isSelected ? 'bg-primary-200 decoration-primary-500' : ''}
          ${assigned && !isSelected && phase !== 'review' ? 'bg-neutral-200 decoration-neutral-400' : ''}
          ${!assigned && !isSelected ? 'bg-yellow-100 decoration-yellow-400 hover:bg-yellow-200' : ''}
          ${phase === 'review' && isCorrect ? 'bg-emerald-200 decoration-emerald-500' : ''}
          ${phase === 'review' && isWrong ? 'bg-rose-200 decoration-rose-500' : ''}
        `}
      >
        {target.text}
      </button>
    )

    lastIndex = target.endIndex
  })

  if (lastIndex < sentence.length) {
    parts.push(<span key={`text-${lastIndex}`}>{sentence.slice(lastIndex)}</span>)
  }

  return <>{parts}</>
}
