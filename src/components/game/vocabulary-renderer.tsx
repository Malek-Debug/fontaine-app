'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, BookOpen } from 'lucide-react'
import { cn } from '@/lib/cn'

const CHOICE_COLORS = [
  'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
  'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700',
  'bg-purple-500 hover:bg-purple-600 active:bg-purple-700',
  'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
  'bg-rose-500 hover:bg-rose-600 active:bg-rose-700',
]

interface VocabularyRendererProps {
  data: string
  phase: 'playing' | 'answered' | 'review'
  endedData: { correctAnswer: string } | null
  onAnswer: (answerJson: string) => void
  disabled: boolean
}

export function VocabularyRenderer({ data, phase, endedData, onAnswer, disabled }: VocabularyRendererProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null)

  let definition = ''
  let choices: string[] = []
  let format = 'definition'
  let contextSentence: string | undefined
  let imageUrl: string | undefined
  try {
    const parsed = JSON.parse(data)
    definition = parsed.definition || ''
    choices = parsed.choices || []
    format = parsed.format || 'definition'
    contextSentence = parsed.contextSentence
    imageUrl = parsed.imageUrl
  } catch {
    return null
  }

  let correctWord: string | null = null
  if (phase === 'review' && endedData) {
    try {
      correctWord = JSON.parse(endedData.correctAnswer).word
    } catch {}
  }

  const handleSelect = (word: string) => {
    if (disabled || selectedWord || phase !== 'playing') return
    setSelectedWord(word)
    onAnswer(JSON.stringify({ selectedWord: word }))
  }

  return (
    <div className="space-y-6">
      {format === 'image_match' && imageUrl && (
        <div className="flex justify-center">
          <div className="overflow-hidden rounded-2xl border-2 border-neutral-200 shadow-sm">
            <img
              src={imageUrl}
              alt="vocabulary image"
              className="max-h-48 w-auto object-contain"
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-neutral-50 p-6 text-center">
        {format === 'fill_blank' && contextSentence ? (
          <p className="text-xl font-medium text-neutral-900 leading-relaxed" dir="rtl">
            {contextSentence.replace('___', '______')}
          </p>
        ) : (
          <>
            <BookOpen className="mx-auto h-8 w-8 text-primary-400 mb-3" />
            <p className="text-xl font-medium text-neutral-900 leading-relaxed" dir="rtl">
              {definition}
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {choices.map((word, i) => {
          const isSelected = selectedWord === word
          const isCorrectRevealed = phase === 'review' && correctWord === word
          const isWrongRevealed = phase === 'review' && isSelected && correctWord !== word

          let btnClass = CHOICE_COLORS[i % CHOICE_COLORS.length]

          if (phase === 'review') {
            if (isCorrectRevealed) {
              btnClass = 'bg-emerald-500 ring-4 ring-emerald-300'
            } else if (isWrongRevealed) {
              btnClass = 'bg-rose-500 opacity-75'
            } else {
              btnClass = 'bg-neutral-300'
            }
          } else if (isSelected) {
            btnClass += ' ring-4 ring-white/50 scale-[0.97]'
          }

          return (
            <button
              key={`${word}-${i}`}
              type="button"
              onClick={() => handleSelect(word)}
              disabled={disabled || !!selectedWord || phase !== 'playing'}
              className={cn(
                'min-h-[64px] rounded-2xl px-5 py-4 text-center text-lg font-bold text-white',
                'transition-all duration-150 disabled:cursor-default shadow-sm active:scale-[0.97]',
                btnClass
              )}
            >
              {word}
              {isCorrectRevealed && <CheckCircle className="inline-block ms-2 h-5 w-5" />}
              {isWrongRevealed && <XCircle className="inline-block ms-2 h-5 w-5" />}
            </button>
          )
        })}
      </div>

      {phase === 'review' && correctWord && (
        <div className="rounded-xl bg-success-50 border border-success-200 p-3 text-center">
          <p className="text-sm text-success-700">
            الكلمة الصحيحة: <span className="font-bold">{correctWord}</span>
          </p>
          {definition && (
            <p className="text-xs text-success-600 mt-1">المعنى: {definition}</p>
          )}
        </div>
      )}
    </div>
  )
}
