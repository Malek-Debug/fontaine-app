import { type CurriculumContext } from './types'
import { formatCurriculumContext } from './curriculum-context'

const GAME_TYPE_LABELS: Record<string, string> = {
  quiz: 'اختبار قصير (Quiz)',
  true_false: 'صحيح أو خطأ (True/False)',
  matching: 'مطابقة (Matching)',
  sentence_builder: 'بناء الجمل (Sentence Builder)',
  order_story: 'ترتيب القصة (Order Story)',
  grammar_detective: 'محقق القواعد (Grammar Detective)',
  find_mistake: 'اكتشف الخطأ (Find Mistake)',
  vocabulary: 'المفردات (Vocabulary)',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'سهل — مفردات بسيطة، جمل قصيرة',
  medium: 'متوسط — مستوى الصف الدراسي',
  hard: 'صعب — تحدٍّ إضافي مع بقاء المحتوى مناسبًا للعمر',
}

function getGameTypeSchema(gameType: string): string {
  const schemas: Record<string, string> = {
    quiz: `{
  "type": "quiz",
  "options": [
    { "id": "a", "text": "الخيار الأول" },
    { "id": "b", "text": "الخيار الثاني" },
    { "id": "c", "text": "الخيار الثالث" },
    { "id": "d", "text": "الخيار الرابع" }
  ],
  "correctOptionId": "a"
}
- options: مصفوفة من 2 إلى 6 خيارات، كل خيار له id (حرف فريد) و text
- correctOptionId: يجب أن يطابق أحد id الخيارات`,

    true_false: `{
  "type": "true_false",
  "statement": "العبارة هنا",
  "correctAnswer": true
}
- statement: العبارة التي يحكم عليها التلميذ
- correctAnswer: true أو false`,

    matching: `{
  "type": "matching",
  "pairs": [
    { "id": "1", "left": "العنصر الأيسر", "right": "العنصر الأيمن" },
    { "id": "2", "left": "العنصر الأيسر", "right": "العنصر الأيمن" }
  ]
}
- pairs: مصفوفة من 2 إلى 10 أزواج، كل زوج له id فريد و left و right
- التلميذ يربط العنصر الأيسر بالأيمن المناسب`,

    sentence_builder: `{
  "type": "sentence_builder",
  "words": ["كلمة1", "كلمة2", "كلمة3", "كلمة4"],
  "correctOrder": ["كلمة2", "كلمة1", "كلمة4", "كلمة3"],
  "hint": "تلميحة اختيارية"
}
- words: الكلمات بترتيب عشوائي (مخلوطة)
- correctOrder: الترتيب الصحيح للجملة
- hint: تلميحة اختيارية لمساعدة التلميذ
- يجب أن تحتوي words و correctOrder على نفس الكلمات بالضبط`,

    order_story: `{
  "type": "order_story",
  "items": [
    { "id": "1", "text": "الجملة الأولى" },
    { "id": "2", "text": "الجملة الثانية" },
    { "id": "3", "text": "الجملة الثالثة" }
  ],
  "correctOrder": ["1", "2", "3"]
}
- items: مصفوفة من 2 إلى 10 عناصر (جمل أو فقرات)
- correctOrder: الترتيب الصحيح لمعرّفات العناصر
- correctOrder يجب أن يحتوي على جميع id العناصر`,

    grammar_detective: `{
  "type": "grammar_detective",
  "sentence": "الجملة الكاملة هنا",
  "targets": [
    { "id": "1", "text": "كلمة", "startIndex": 0, "endIndex": 4, "label": "فعل" }
  ],
  "availableLabels": ["فعل", "فاعل", "مفعول به", "حرف جر"]
}
- sentence: الجملة التي يحللها التلميذ
- targets: الكلمات المستهدفة في الجملة مع مواقعها الدقيقة
- startIndex/endIndex: موقع الكلمة في النص (بالحرف)
- label: التصنيف النحوي الصحيح
- availableLabels: جميع التصنيفات المتاحة للاختيار
- تأكد أن startIndex و endIndex يطابقان موقع text في sentence بالضبط`,

    find_mistake: `{
  "type": "find_mistake",
  "sentenceWithMistake": "الجملة التي تحتوي على خطأ",
  "correctedSentence": "الجملة الصحيحة",
  "mistakeText": "الكلمة الخطأ",
  "correctionText": "الكلمة الصحيحة",
  "mistakeStartIndex": 0,
  "mistakeEndIndex": 5
}
- sentenceWithMistake: الجملة مع الخطأ
- correctedSentence: نفس الجملة بعد التصحيح
- mistakeText: النص الخاطئ بالضبط كما يظهر في الجملة
- correctionText: التصحيح
- mistakeStartIndex/mistakeEndIndex: موقع الخطأ في sentenceWithMistake
- تأكد أن sentenceWithMistake.substring(mistakeStartIndex, mistakeEndIndex) === mistakeText`,

    vocabulary: `{
  "type": "vocabulary",
  "word": "الكلمة",
  "definition": "تعريف الكلمة",
  "distractors": ["معنى خاطئ 1", "معنى خاطئ 2", "معنى خاطئ 3"],
  "format": "definition",
  "contextSentence": "جملة تستخدم الكلمة في سياق"
}
- word: الكلمة المستهدفة
- definition: التعريف الصحيح
- distractors: مصفوفة من 1 إلى 5 تعريفات خاطئة (مشتتات)
- format: أحد القيم التالية: "definition" أو "fill_blank" أو "image_match"
- contextSentence: جملة اختيارية توضح استخدام الكلمة`,
  }

  return schemas[gameType] || schemas.quiz
}

const BASE_SYSTEM_PROMPT = `أنت مُنشئ محتوى تعليمي باللغة العربية لتلاميذ تونسيين في السنة الثالثة ابتدائي (8-9 سنوات).
تُنشئ أنشطة تعليمية تفاعلية مُهيكلة بصيغة JSON.

قواعد صارمة يجب اتباعها:
1. أجب بـ JSON صالح فقط. لا تضع أي نص أو شرح أو تعليق قبل أو بعد الـ JSON.
2. لا تستخدم كتل كود markdown مثل \`\`\`json. أجب بـ JSON مباشرة.
3. تأكد أن الـ JSON صالح تقنيًا: أقواس متطابقة، فواصل صحيحة، نصوص بين علامات اقتباس مزدوجة.
4. المحتوى يجب أن يكون مناسبًا لعمر 8-9 سنوات فقط.
5. استخدم العربية الفصحى المبسّطة المناسبة للمنهج الدراسي التونسي للسنة الثالثة.
6. لا تستخدم محتوى عنيفًا أو مخيفًا أو غير لائق.
7. الجمل قصيرة وواضحة.
8. لا تُدخل مفاهيم نحوية أو معجمية خارج نطاق المهارة المطلوبة.
9. لا تخترع وحدات أو دروس أو أهداف تعليمية غير موجودة في السياق المنهجي.`

export function buildActivityGenerationPrompt(
  ctx: CurriculumContext,
  gameType: string,
  difficulty: string,
  questionCount: number
): { system: string; user: string } {
  const gameLabel = GAME_TYPE_LABELS[gameType] || gameType
  const diffLabel = DIFFICULTY_LABELS[difficulty] || difficulty
  const schema = getGameTypeSchema(gameType)

  const system = BASE_SYSTEM_PROMPT

  const user = `أنشئ نشاطًا تعليميًا من نوع "${gameLabel}" يحتوي على ${questionCount} أسئلة.

السياق المنهجي:
${formatCurriculumContext(ctx)}

مستوى الصعوبة: ${diffLabel}

أجب بـ JSON بالشكل التالي بالضبط:
{
  "title": "عنوان باللغة الإنجليزية",
  "titleAr": "عنوان باللغة العربية",
  "description": "وصف قصير بالإنجليزية",
  "descriptionAr": "وصف قصير بالعربية",
  "questions": [
    {
      "questionText": "نص السؤال بالعربية",
      "questionType": "${gameType}",
      "data": { ... },
      "explanation": "شرح مختصر للإجابة الصحيحة"
    }
  ]
}

كل سؤال يجب أن يحتوي على حقل "data" بالشكل التالي:
${schema}

تعليمات إضافية:
- questionType يجب أن يكون "${gameType}" لجميع الأسئلة
- questionText بالعربية دائمًا
- explanation اختياري لكنه مفيد للمعلم
- تأكد من صحة كل الأسئلة علميًا ولغويًا
- نوّع في محتوى الأسئلة ولا تكرر نفس الفكرة
- أنشئ بالضبط ${questionCount} أسئلة
- لا تُولّد محتوى خارج نطاق المهارة "${ctx.skill.nameAr}"
- أجب بـ JSON فقط. لا تكتب أي نص آخر.`

  return { system, user }
}

export function buildRemediationPrompt(
  ctx: CurriculumContext,
  weaknessData: {
    totalAttempts: number
    correctCount: number
    commonMistakes?: string[]
  },
  gameType: string,
  questionCount: number
): { system: string; user: string } {
  const accuracy = weaknessData.totalAttempts > 0
    ? Math.round((weaknessData.correctCount / weaknessData.totalAttempts) * 100)
    : 0

  const schema = getGameTypeSchema(gameType)
  const gameLabel = GAME_TYPE_LABELS[gameType] || gameType

  const system = `${BASE_SYSTEM_PROMPT}

هذا نشاط علاجي لتلميذ أو مجموعة يواجهون صعوبة في هذه المهارة.
- ركّز على المفاهيم الأساسية.
- استخدم مفردات أبسط.
- قدّم مزيدًا من الدعم والتدرّج.
- ابدأ بأسئلة سهلة ثم تدرّج في الصعوبة.`

  const mistakesSection = weaknessData.commonMistakes?.length
    ? `\nالأخطاء الشائعة المُلاحظة:\n${weaknessData.commonMistakes.map((m) => `- ${m}`).join('\n')}`
    : ''

  const user = `أنشئ نشاطًا علاجيًا من نوع "${gameLabel}" يحتوي على ${questionCount} أسئلة.

السياق المنهجي:
${formatCurriculumContext(ctx)}

بيانات الأداء:
- عدد المحاولات: ${weaknessData.totalAttempts}
- الإجابات الصحيحة: ${weaknessData.correctCount}
- نسبة النجاح: ${accuracy}%${mistakesSection}

أجب بـ JSON بالشكل التالي بالضبط:
{
  "title": "remediation title in English",
  "titleAr": "تمارين علاجية: ${ctx.skill.nameAr}",
  "description": "Remediation activity for ${ctx.skill.name}",
  "descriptionAr": "نشاط علاجي لتعزيز مهارة ${ctx.skill.nameAr}",
  "questions": [
    {
      "questionText": "نص السؤال بالعربية",
      "questionType": "${gameType}",
      "data": { ... },
      "explanation": "شرح مبسّط للإجابة الصحيحة"
    }
  ]
}

كل سؤال يجب أن يحتوي على حقل "data" بالشكل التالي:
${schema}

تعليمات إضافية:
- ركّز على نقاط الضعف المحددة أعلاه
- ابدأ بأسئلة بسيطة لبناء الثقة
- قدّم تفسيرات واضحة في حقل explanation
- أنشئ بالضبط ${questionCount} أسئلة
- أجب بـ JSON فقط. لا تكتب أي نص آخر.`

  return { system, user }
}

export function buildSkillExplanationPrompt(
  ctx: CurriculumContext,
  mistakeData: {
    questionText: string
    studentAnswer: string
    correctAnswer: string
    isCorrect: boolean
  }[]
): { system: string; user: string } {
  const system = `أنت محلل تربوي تساعد المعلم على فهم أخطاء التلاميذ.
أجب بالعربية بنص عادي (ليس JSON).
حلّل الأنماط في الأخطاء وقدّم اقتراحات تدريسية عملية.
لا تختلق أنماطًا غير موجودة في البيانات.

مهم جدًا: افصل بوضوح بين:
- البيانات الملاحظة (ما حدث فعلاً في الإجابات)
- التفسير المحتمل (تحليلك الشخصي لسبب الخطأ)
لا تقدّم التفسير على أنه تشخيص مؤكد. استخدم عبارات مثل "قد يكون" و"من المحتمل".`

  const mistakesFormatted = mistakeData
    .map((m, i) => {
      const status = m.isCorrect ? '✓ صحيح' : '✗ خطأ'
      return `${i + 1}. السؤال: ${m.questionText}
   إجابة التلميذ: ${m.studentAnswer}
   الإجابة الصحيحة: ${m.correctAnswer}
   النتيجة: ${status}`
    })
    .join('\n\n')

  const totalCorrect = mistakeData.filter((m) => m.isCorrect).length
  const accuracy = mistakeData.length > 0
    ? Math.round((totalCorrect / mistakeData.length) * 100)
    : 0

  const user = `حلّل أخطاء التلاميذ في المهارة التالية وقدّم اقتراحات للمعلم.

المهارة: ${ctx.skill.nameAr}
${formatCurriculumContext(ctx)}

ملخص الأداء: ${totalCorrect} إجابة صحيحة من أصل ${mistakeData.length} (${accuracy}%)

تفاصيل الإجابات:
${mistakesFormatted}

قدّم تحليلك في الأقسام التالية:
1. **الأنماط المُلاحظة**: ما هي الأخطاء المتكررة؟
2. **التفسير المحتمل**: لماذا يخطئ التلاميذ في هذه النقاط؟
3. **اقتراحات للمعلم**: كيف يمكن معالجة هذه الصعوبات؟
4. **أنشطة مقترحة**: ما نوع التمارين التي تساعد في تجاوز هذه الصعوبات؟`

  return { system, user }
}

export function buildChatSystemPrompt(
  ctx?: CurriculumContext,
  classData?: {
    className: string
    studentCount: number
    averageScore: number
  }
): string {
  let prompt = `أنت مساعد تدريس ذكي في منصة "فنتين" التعليمية للغة العربية — السنة الثالثة ابتدائي (تونس).
تساعد المعلم في التخطيط للدروس وإنشاء الأنشطة وتقييم التلاميذ.

قواعد:
- أجب دائمًا بالعربية الفصحى.
- يمكنك اقتراح إنشاء أنشطة أو شرح مفاهيم تربوية أو التوصية بأنشطة علاجية.
- لا يمكنك تنفيذ إجراءات مباشرة — تقترح والمعلم يؤكد.
- لا تختلق بيانات أو نتائج.
- كن عمليًا ومختصرًا في إجاباتك.
- إذا سألك المعلم عن موضوع لا علاقة له بالتعليم أو المنهج الدراسي، أجب بلطف أنك مخصص لمساعدته في التدريس فقط.`

  if (ctx) {
    prompt += `\n\nالسياق المنهجي الحالي:\n${formatCurriculumContext(ctx)}`
  }

  if (classData) {
    prompt += `\n\nبيانات القسم:
- اسم القسم: ${classData.className}
- عدد التلاميذ: ${classData.studentCount}
- معدل النتائج: ${classData.averageScore}%`
  }

  return prompt
}
