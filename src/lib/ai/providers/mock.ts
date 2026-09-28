import type { AiProvider, AiCompletionOptions, AiChatTurn } from '../client'
import type { CallClaudeResult } from '../types'

const GAME_TYPE_MOCK_GENERATORS: Record<string, (count: number) => object[]> = {
  quiz: (count) =>
    Array.from({ length: count }, (_, i) => ({
      questionText: `سؤال تجريبي ${i + 1}: ما هو الجواب الصحيح؟`,
      questionType: 'quiz',
      data: {
        type: 'quiz',
        options: [
          { id: 'a', text: 'الخيار الأول' },
          { id: 'b', text: 'الخيار الثاني' },
          { id: 'c', text: 'الخيار الثالث' },
          { id: 'd', text: 'الخيار الرابع' },
        ],
        correctOptionId: 'a',
      },
      explanation: 'هذا سؤال تجريبي من المزوّد التجريبي',
    })),

  true_false: (count) =>
    Array.from({ length: count }, (_, i) => ({
      questionText: `عبارة تجريبية ${i + 1}: الأرض كروية الشكل`,
      questionType: 'true_false',
      data: {
        type: 'true_false',
        statement: `عبارة تجريبية ${i + 1}`,
        correctAnswer: i % 2 === 0,
      },
      explanation: 'عبارة تجريبية للاختبار',
    })),

  matching: (count) =>
    Array.from({ length: count }, (_, i) => ({
      questionText: `مطابقة تجريبية ${i + 1}`,
      questionType: 'matching',
      data: {
        type: 'matching',
        pairs: [
          { id: '1', left: 'قلم', right: 'يكتب' },
          { id: '2', left: 'كتاب', right: 'يُقرأ' },
          { id: '3', left: 'مدرسة', right: 'نتعلّم' },
        ],
      },
      explanation: 'مطابقة تجريبية',
    })),

  sentence_builder: (count) =>
    Array.from({ length: count }, (_, i) => ({
      questionText: `رتّب الكلمات لتكوين جملة مفيدة (${i + 1})`,
      questionType: 'sentence_builder',
      data: {
        type: 'sentence_builder',
        words: ['المدرسة', 'إلى', 'ذهب', 'التلميذ'],
        correctOrder: ['ذهب', 'التلميذ', 'إلى', 'المدرسة'],
        hint: 'ابدأ بالفعل',
      },
      explanation: 'الترتيب الصحيح: ذهب التلميذ إلى المدرسة',
    })),

  order_story: (count) =>
    Array.from({ length: count }, (_, i) => ({
      questionText: `رتّب أحداث القصة (${i + 1})`,
      questionType: 'order_story',
      data: {
        type: 'order_story',
        items: [
          { id: '1', text: 'استيقظ أحمد من النوم' },
          { id: '2', text: 'غسل وجهه وأسنانه' },
          { id: '3', text: 'تناول فطور الصباح' },
          { id: '4', text: 'ذهب إلى المدرسة' },
        ],
        correctOrder: ['1', '2', '3', '4'],
      },
      explanation: 'ترتيب زمني لأحداث الصباح',
    })),

  grammar_detective: (count) =>
    Array.from({ length: count }, (_, i) => ({
      questionText: `حدّد نوع الكلمة في الجملة (${i + 1})`,
      questionType: 'grammar_detective',
      data: {
        type: 'grammar_detective',
        sentence: 'كتب التلميذ الدرس',
        targets: [
          { id: '1', text: 'كتب', startIndex: 0, endIndex: 3, label: 'فعل' },
          { id: '2', text: 'التلميذ', startIndex: 4, endIndex: 11, label: 'فاعل' },
          { id: '3', text: 'الدرس', startIndex: 12, endIndex: 17, label: 'مفعول به' },
        ],
        availableLabels: ['فعل', 'فاعل', 'مفعول به', 'حرف جر'],
      },
      explanation: 'كتب: فعل، التلميذ: فاعل، الدرس: مفعول به',
    })),

  find_mistake: (count) =>
    Array.from({ length: count }, (_, i) => ({
      questionText: `اكتشف الخطأ في الجملة (${i + 1})`,
      questionType: 'find_mistake',
      data: {
        type: 'find_mistake',
        sentenceWithMistake: 'ذهب الطالبات إلى المدرسة',
        correctedSentence: 'ذهبت الطالبات إلى المدرسة',
        mistakeText: 'ذهب',
        correctionText: 'ذهبت',
        mistakeStartIndex: 0,
        mistakeEndIndex: 3,
      },
      explanation: 'الفعل يُؤنّث مع الفاعل المؤنث',
    })),

  vocabulary: (count) =>
    Array.from({ length: count }, (_, i) => ({
      questionText: `ما معنى الكلمة التالية؟ (${i + 1})`,
      questionType: 'vocabulary',
      data: {
        type: 'vocabulary',
        word: 'الفرح',
        definition: 'شعور بالسعادة والسرور',
        distractors: ['شعور بالحزن', 'شعور بالخوف', 'شعور بالغضب'],
        format: 'definition_match',
        contextSentence: 'شعر الطفل بالفرح عندما رأى أصدقاءه',
      },
      explanation: 'الفرح هو شعور إيجابي بالسعادة',
    })),
}

function generateMockActivity(prompt: string): string {
  let gameType = 'quiz'
  let questionCount = 5

  const typeMatch = prompt.match(/"questionType":\s*"([a-z_]+)"/)
  if (typeMatch && typeMatch[1] in GAME_TYPE_MOCK_GENERATORS) {
    gameType = typeMatch[1]
  }

  const countMatch = prompt.match(/(\d+)\s*أسئلة/)
  if (countMatch) {
    questionCount = Math.min(parseInt(countMatch[1], 10), 15)
  }

  const generator = GAME_TYPE_MOCK_GENERATORS[gameType] || GAME_TYPE_MOCK_GENERATORS.quiz
  const questions = generator(questionCount)

  return JSON.stringify({
    title: `Mock Activity: ${gameType}`,
    titleAr: `نشاط تجريبي: ${gameType}`,
    description: 'This is a mock-generated activity for development testing.',
    descriptionAr: 'هذا نشاط تجريبي مُنشأ بالمزوّد التجريبي للاختبار.',
    questions,
  })
}

function generateMockChatResponse(messages: AiChatTurn[]): string {
  const lastMessage = messages[messages.length - 1]?.content || ''

  if (lastMessage.includes('نشاط') || lastMessage.includes('activity')) {
    return 'يمكنني مساعدتك في إنشاء أنشطة تعليمية. يُرجى الانتقال إلى صفحة "إنشاء بالذكاء الاصطناعي" من القائمة الجانبية واختيار المهارة ونوع اللعبة المطلوبين.\n\nملاحظة: هذا ردّ تجريبي من المزوّد التجريبي. عند توصيل نموذج ذكاء اصطناعي محلّي، ستحصل على ردود مخصّصة.'
  }

  if (lastMessage.includes('تلميذ') || lastMessage.includes('student')) {
    return 'لمتابعة أداء التلاميذ، يمكنك:\n1. الاطلاع على صفحة التحليلات لرؤية المهارات الضعيفة\n2. فتح ملف التلميذ لمعرفة الأسئلة الأكثر خطأً\n3. إنشاء تمارين علاجية للمهارات التي تحتاج تعزيز\n\nملاحظة: هذا ردّ تجريبي.'
  }

  return 'مرحبًا! أنا المساعد الذكي لمنصة فنتين. يمكنني مساعدتك في:\n- التخطيط للدروس\n- إنشاء الأنشطة التعليمية\n- تحليل أداء التلاميذ\n- اقتراح تمارين علاجية\n\nملاحظة: هذا ردّ تجريبي من المزوّد التجريبي. قم بتوصيل نموذج ذكاء اصطناعي محلّي للحصول على ردود ذكية حقيقية.'
}

function generateMockExplanation(prompt: string): string {
  return `## تحليل الأخطاء (تجريبي)

### الأنماط المُلاحظة
هذا تحليل تجريبي من المزوّد التجريبي. عند توصيل نموذج ذكاء اصطناعي محلّي، سيتم تحليل أنماط الأخطاء الفعلية للتلاميذ.

### التفسير المحتمل
- قد يكون هناك ضعف في فهم المفاهيم الأساسية
- قد يحتاج التلاميذ إلى مزيد من التمارين

### اقتراحات للمعلم
1. مراجعة المفاهيم الأساسية مع التلاميذ
2. استخدام أمثلة متنوعة
3. تقديم تمارين تدريجية الصعوبة

### أنشطة مقترحة
- تمارين مطابقة لتعزيز الفهم
- اختبارات قصيرة للمراجعة
- أنشطة بناء الجمل للتطبيق`
}

export class MockAiProvider implements AiProvider {
  name = 'mock'

  async isAvailable(): Promise<boolean> {
    return true
  }

  async complete(prompt: string, options?: AiCompletionOptions): Promise<CallClaudeResult> {
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700))

    let content: string
    if (prompt.includes('أنشئ نشاطًا') || prompt.includes('أنشئ نشاط')) {
      content = generateMockActivity(prompt)
    } else if (prompt.includes('حلّل أخطاء') || prompt.includes('تحليل')) {
      content = generateMockExplanation(prompt)
    } else {
      content = generateMockChatResponse([{ role: 'user', content: prompt }])
    }

    return {
      content,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: 800,
    }
  }

  async chat(messages: AiChatTurn[], options?: AiCompletionOptions): Promise<CallClaudeResult> {
    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 600))

    const content = generateMockChatResponse(messages)

    return {
      content,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: 600,
    }
  }
}
