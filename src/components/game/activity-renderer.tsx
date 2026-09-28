'use client'

import { QuizRenderer } from './quiz-renderer'
import { TrueFalseRenderer } from './true-false-renderer'
import { MatchingRenderer } from './matching-renderer'
import { SentenceBuilderRenderer } from './sentence-builder-renderer'
import { OrderStoryRenderer } from './order-story-renderer'
import { GrammarDetectiveRenderer } from './grammar-detective-renderer'
import { FindMistakeRenderer } from './find-mistake-renderer'
import { VocabularyRenderer } from './vocabulary-renderer'

export interface ActivityRendererProps {
  questionType: string
  questionText: string
  data: string
  phase: 'playing' | 'answered' | 'review'
  answerResult: { isCorrect: boolean; score: number } | null
  endedData: { correctAnswer: string; stats: { correctCount: number; totalAnswers: number; averageTime: number } } | null
  onAnswer: (answerJson: string) => void
  disabled: boolean
}

export function ActivityRenderer({
  questionType,
  data,
  phase,
  endedData,
  onAnswer,
  disabled,
}: ActivityRendererProps) {
  const rendererProps = {
    data,
    phase,
    endedData,
    onAnswer,
    disabled,
  }

  switch (questionType) {
    case 'quiz':
      return <QuizRenderer {...rendererProps} />
    case 'true_false':
      return <TrueFalseRenderer phase={phase} endedData={endedData} onAnswer={onAnswer} disabled={disabled} />
    case 'matching':
      return <MatchingRenderer {...rendererProps} />
    case 'sentence_builder':
      return <SentenceBuilderRenderer {...rendererProps} />
    case 'order_story':
      return <OrderStoryRenderer {...rendererProps} />
    case 'grammar_detective':
      return <GrammarDetectiveRenderer {...rendererProps} />
    case 'find_mistake':
      return <FindMistakeRenderer {...rendererProps} />
    case 'vocabulary':
      return <VocabularyRenderer {...rendererProps} />
    default:
      return (
        <div className="rounded-2xl bg-neutral-100 p-6 text-center text-neutral-500">
          نوع اللعبة غير مدعوم
        </div>
      )
  }
}
