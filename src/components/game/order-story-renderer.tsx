'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react'

interface OrderStoryRendererProps {
  data: string
  phase: 'playing' | 'answered' | 'review'
  endedData: { correctAnswer: string } | null
  onAnswer: (answerJson: string) => void
  disabled: boolean
}

export function OrderStoryRenderer({ data, phase, endedData, onAnswer, disabled }: OrderStoryRendererProps) {
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  let items: Array<{ id: string; text: string }> = []
  try {
    const parsed = JSON.parse(data)
    items = parsed.items || []
  } catch {
    return null
  }

  let correctOrder: string[] | null = null
  if (phase === 'review' && endedData) {
    try {
      correctOrder = JSON.parse(endedData.correctAnswer).correctOrder
    } catch {}
  }

  const selectedItems = orderedIds.map((id) => items.find((item) => item.id === id)!)
  const remainingItems = items.filter((item) => !orderedIds.includes(item.id))

  const handleItemTap = (id: string) => {
    if (disabled || submitted || phase !== 'playing') return
    const newOrder = [...orderedIds, id]
    setOrderedIds(newOrder)

    if (newOrder.length === items.length) {
      setSubmitted(true)
      onAnswer(JSON.stringify({ orderedItemIds: newOrder }))
    }
  }

  const handleRemoveItem = (index: number) => {
    if (disabled || submitted || phase !== 'playing') return
    setOrderedIds((prev) => prev.slice(0, index))
  }

  const handleReset = () => {
    if (disabled || submitted || phase !== 'playing') return
    setOrderedIds([])
  }

  const isCorrect = phase === 'review' && correctOrder && JSON.stringify(orderedIds) === JSON.stringify(correctOrder)

  return (
    <div className="space-y-6">
      {selectedItems.length > 0 && (
        <div className={`
          rounded-2xl border-2 p-4 space-y-2
          ${phase === 'review' ? (isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50') : 'border-primary-200 bg-primary-50'}
        `}>
          <p className="text-xs font-medium text-neutral-500 mb-2">ترتيبك:</p>
          {selectedItems.map((item, i) => {
            const isItemCorrect = phase === 'review' && correctOrder && correctOrder[i] === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleRemoveItem(i)}
                disabled={disabled || submitted || phase !== 'playing'}
                className={`
                  flex w-full min-h-[52px] items-center gap-3 rounded-xl px-4 py-3 text-start transition-all
                  disabled:cursor-default
                  ${phase === 'review'
                    ? isItemCorrect
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-rose-100 text-rose-900'
                    : 'bg-white text-neutral-900 shadow-sm hover:shadow-md active:scale-[0.98]'}
                `}
              >
                <span className={`
                  flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold
                  ${phase === 'review'
                    ? isItemCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    : 'bg-primary-500 text-white'}
                `}>
                  {i + 1}
                </span>
                <span className="font-medium">{item.text}</span>
                {phase === 'review' && isItemCorrect && <CheckCircle className="ms-auto h-5 w-5 text-emerald-500 shrink-0" />}
                {phase === 'review' && !isItemCorrect && <XCircle className="ms-auto h-5 w-5 text-rose-500 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}

      {phase === 'review' && !isCorrect && correctOrder && (
        <div className="rounded-xl bg-success-50 border border-success-200 p-3 space-y-1">
          <p className="text-xs font-medium text-success-700">الترتيب الصحيح:</p>
          {correctOrder.map((id, i) => {
            const item = items.find((it) => it.id === id)
            return (
              <p key={id} className="text-sm text-success-800">
                {i + 1}. {item?.text}
              </p>
            )
          })}
        </div>
      )}

      {phase === 'playing' && !submitted && (
        <>
          {remainingItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-500">
                {orderedIds.length === 0 ? 'اضغط على الجمل بالترتيب الصحيح:' : 'التالي:'}
              </p>
              {remainingItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemTap(item.id)}
                  disabled={disabled}
                  className="flex w-full min-h-[56px] items-center rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-start font-medium text-neutral-900 transition-all hover:border-primary-300 hover:bg-primary-50 active:scale-[0.98]"
                >
                  {item.text}
                </button>
              ))}
            </div>
          )}

          {orderedIds.length > 0 && (
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
