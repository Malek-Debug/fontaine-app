'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Send } from 'lucide-react'

interface FindMistakeRendererProps {
  data: string
  phase: 'playing' | 'answered' | 'review'
  endedData: { correctAnswer: string } | null
  onAnswer: (answerJson: string) => void
  disabled: boolean
}

export function FindMistakeRenderer({ data, phase, endedData, onAnswer, disabled }: FindMistakeRendererProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [correction, setCorrection] = useState('')
  const [submitted, setSubmitted] = useState(false)

  let sentenceWithMistake = ''
  try {
    const parsed = JSON.parse(data)
    sentenceWithMistake = parsed.sentenceWithMistake || ''
  } catch {
    return null
  }

  let correctData: { mistakeText: string; correctionText: string; correctedSentence: string } | null = null
  if (phase === 'review' && endedData) {
    try {
      correctData = JSON.parse(endedData.correctAnswer)
    } catch {}
  }

  const words = sentenceWithMistake.split(/(\s+)/).filter((w) => w.trim().length > 0)

  const handleWordTap = (word: string) => {
    if (disabled || submitted || phase !== 'playing') return
    setSelectedWord(selectedWord === word ? null : word)
  }

  const handleSubmit = () => {
    if (disabled || submitted || !selectedWord || !correction.trim() || phase !== 'playing') return
    setSubmitted(true)
    onAnswer(JSON.stringify({ selectedText: selectedWord, correction: correction.trim() }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-neutral-50 p-6" dir="rtl">
        <p className="text-center text-sm text-neutral-500 mb-4">اضغط على الكلمة الخاطئة:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {words.map((word, i) => {
            const isSelected = selectedWord === word
            const isCorrectMistake = phase === 'review' && correctData && word === correctData.mistakeText
            const isWrongSelection = phase === 'review' && correctData && isSelected && word !== correctData.mistakeText

            return (
              <button
                key={`${word}-${i}`}
                type="button"
                onClick={() => handleWordTap(word)}
                disabled={disabled || submitted || phase !== 'playing'}
                className={`
                  min-h-[48px] rounded-xl border-2 px-4 py-2 text-lg font-medium transition-all
                  ${isSelected && phase === 'playing' ? 'border-rose-500 bg-rose-50 text-rose-700 scale-105' : ''}
                  ${!isSelected && phase === 'playing' ? 'border-transparent bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100' : ''}
                  ${isCorrectMistake ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-300' : ''}
                  ${isWrongSelection ? 'border-rose-500 bg-rose-50 text-rose-700' : ''}
                  ${phase === 'review' && !isCorrectMistake && !isWrongSelection ? 'border-transparent bg-white text-neutral-600' : ''}
                  disabled:cursor-default
                `}
              >
                {word}
                {isCorrectMistake && <CheckCircle className="inline-block ms-1 h-4 w-4 text-emerald-500" />}
                {isWrongSelection && <XCircle className="inline-block ms-1 h-4 w-4 text-rose-500" />}
              </button>
            )
          })}
        </div>
      </div>

      {phase === 'playing' && selectedWord && !submitted && (
        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-neutral-600">
              الكلمة المختارة: <span className="font-bold text-rose-600">{selectedWord}</span>
            </p>
            <p className="mb-2 text-sm font-medium text-neutral-600">اكتب التصحيح:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="التصحيح..."
                dir="auto"
                className="flex-1 min-h-[48px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-2 text-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!correction.trim()}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'review' && correctData && (
        <div className="rounded-xl bg-success-50 border border-success-200 p-4 space-y-2">
          <p className="text-sm font-medium text-success-700">
            الخطأ: <span className="font-bold text-rose-600 line-through">{correctData.mistakeText}</span>
            {' → '}
            <span className="font-bold text-success-700">{correctData.correctionText}</span>
          </p>
          <p className="text-sm text-success-800">
            الجملة الصحيحة: {correctData.correctedSentence}
          </p>
        </div>
      )}
    </div>
  )
}
