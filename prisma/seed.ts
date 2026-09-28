import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ============== CONFIDENCE LEVELS ==============
// [VERIFIED]     = Confirmed from authoritative source (Ministry/CNP/textbook structure)
// [STRUCTURE]    = Standard 4-domain-per-unit layout for Tunisian Arabic — HIGH confidence
// [SUPPORTED]    = From user-provided research data consistent with Tunisian curriculum
// [PEDAGOGICAL]  = Pedagogically appropriate but NOT from user research — needs textbook verification
// NOTE: Reading text titles from user research require final verification against:
//   "ينابيع: كتاب القراءة لتلاميذ السنة الثالثة من التعليم الأساسي" (CNP)

// ============== IDEMPOTENT HELPERS ==============

async function findOrCreate<T>(
  findFn: () => Promise<T | null>,
  createFn: () => Promise<T>,
): Promise<T> {
  const existing = await findFn()
  if (existing) return existing
  return createFn()
}

async function seedDomain(unitId: string, nameAr: string, name: string, orderIndex: number) {
  return findOrCreate(
    () => prisma.domain.findFirst({ where: { unitId, nameAr } }),
    () => prisma.domain.create({ data: { name, nameAr, orderIndex, unitId } }),
  )
}

async function seedLesson(domainId: string, nameAr: string, name: string, orderIndex: number) {
  const byIndex = await prisma.lesson.findFirst({ where: { domainId, orderIndex } })
  if (byIndex) {
    if (byIndex.nameAr !== nameAr) {
      return prisma.lesson.update({ where: { id: byIndex.id }, data: { name, nameAr } })
    }
    return byIndex
  }
  const byName = await prisma.lesson.findFirst({ where: { domainId, nameAr } })
  if (byName) return byName
  return prisma.lesson.create({ data: { name, nameAr, orderIndex, domainId } })
}

async function seedSkill(lessonId: string, nameAr: string, name: string, category: string) {
  return findOrCreate(
    () => prisma.skill.findFirst({ where: { lessonId, nameAr } }),
    () => prisma.skill.create({ data: { name, nameAr, category, lessonId } }),
  )
}

async function seedActivity(skillId: string, titleAr: string, data: Parameters<typeof prisma.activity.create>[0]['data']) {
  return findOrCreate(
    () => prisma.activity.findFirst({ where: { skillId, titleAr } }),
    () => prisma.activity.create({ data }),
  )
}

async function seedQuestions(activityId: string, questions: any[]) {
  const count = await prisma.question.count({ where: { activityId } })
  if (count === 0) {
    await prisma.question.createMany({ data: questions as any[] })
  }
}

async function main() {
  console.log('🌱 Seeding database...')

  const existingCount = await prisma.user.count()
  if (existingCount > 0) {
    console.log('⚠️  Existing data detected — running in idempotent mode (preserving data)')
  } else {
    console.log('📦 Fresh database — running full seed')
  }

  // ============== TEACHER ==============
  const passwordHash = await bcrypt.hash('fontaine2026', 10)

  const teacher = await findOrCreate(
    () => prisma.user.findUnique({ where: { email: 'teacher@fontaine.tn' } }),
    () => prisma.user.create({
      data: { email: 'teacher@fontaine.tn', name: 'فاطمة المعلمة', passwordHash, role: 'teacher' },
    }),
  )
  console.log('✅ Teacher:', teacher.email)

  // ============== GRADE [VERIFIED] ==============
  const grade = await findOrCreate(
    () => prisma.grade.findFirst({ where: { level: 3 } }),
    () => prisma.grade.create({
      data: { name: '3rd Year Primary', nameAr: 'السنة الثالثة ابتدائي', nameFr: '3ème année primaire', level: 3 },
    }),
  )

  // ============== SUBJECT [VERIFIED] ==============
  const arabic = await findOrCreate(
    () => prisma.subject.findFirst({ where: { gradeId: grade.id, nameAr: 'اللغة العربية' } }),
    () => prisma.subject.create({
      data: { name: 'Arabic', nameAr: 'اللغة العربية', nameFr: 'Langue arabe', icon: '📖', gradeId: grade.id },
    }),
  )

  // ============== CLASS ==============
  const classA = await findOrCreate(
    () => prisma.class.findUnique({ where: { joinCode: 'FONT3A' } }),
    () => prisma.class.create({
      data: { name: 'القسم أ - السنة الثالثة', gradeId: grade.id, academicYear: '2026-2027', joinCode: 'FONT3A', teacherId: teacher.id },
    }),
  )
  console.log('✅ Class:', classA.name)

  // ============== STUDENTS ==============
  const studentNames = [
    { firstName: 'أحمد', lastName: 'بن علي', displayName: 'أحمد' },
    { firstName: 'فاطمة الزهراء', lastName: 'بن سالم', displayName: 'فاطمة' },
    { firstName: 'محمد أمين', lastName: 'التونسي', displayName: 'محمد أمين' },
    { firstName: 'مريم', lastName: 'بن حسن', displayName: 'مريم' },
    { firstName: 'يوسف', lastName: 'المنصوري', displayName: 'يوسف' },
    { firstName: 'سارة', lastName: 'بن محمد', displayName: 'سارة' },
    { firstName: 'عمر', lastName: 'بن يوسف', displayName: 'عمر' },
    { firstName: 'ليلى', lastName: 'العيني', displayName: 'ليلى' },
    { firstName: 'آدم', lastName: 'بن خليل', displayName: 'آدم' },
    { firstName: 'نور', lastName: 'الهاني', displayName: 'نور' },
  ]

  const students = []
  for (const s of studentNames) {
    const student = await findOrCreate(
      () => prisma.student.findFirst({ where: { classId: classA.id, firstName: s.firstName, lastName: s.lastName } }),
      () => prisma.student.create({ data: { ...s, classId: classA.id } }),
    )
    students.push(student)
  }
  console.log(`✅ ${students.length} students`)

  // ============== CURRICULUM: 8 UNITS × 4 DOMAINS ==============
  // Each unit: القراءة + قواعد اللغة + الإنتاج الكتابي + التواصل الشفوي [STRUCTURE]

  async function seedUnit(orderIndex: number, data: { name: string; nameAr: string; themeAr: string; description?: string; descriptionAr?: string }) {
    return findOrCreate(
      () => prisma.unit.findFirst({ where: { subjectId: arabic.id, orderIndex } }),
      () => prisma.unit.create({
        data: {
          name: data.name, nameAr: data.nameAr, themeAr: data.themeAr,
          description: data.description || '', descriptionAr: data.descriptionAr || '',
          orderIndex, subjectId: arabic.id,
        },
      }),
    )
  }

  // ===================================================================
  //  UNIT 1: الإنسان مع الطبيعة [SUPPORTED]
  // ===================================================================
  const unit1 = await seedUnit(1, { name: 'Man and Nature', nameAr: 'الإنسان مع الطبيعة', themeAr: 'الإنسان مع الطبيعة', descriptionAr: 'محور الإنسان والطبيعة' })

  const u1_reading = await seedDomain(unit1.id, 'القراءة', 'Reading', 1)
  const u1_grammar = await seedDomain(unit1.id, 'قواعد اللغة', 'Grammar', 2)
  const u1_writing = await seedDomain(unit1.id, 'الإنتاج الكتابي', 'Writing', 3)
  const u1_oral = await seedDomain(unit1.id, 'التواصل الشفوي', 'Oral Communication', 4)

  const u1_l1 = await seedLesson(u1_reading.id, 'خلقت لتنعم بالحرية', 'Created to Enjoy Freedom', 1) // [SUPPORTED]
  const u1_l2 = await seedLesson(u1_reading.id, 'وهكذا تستمر الحياة', 'And So Life Continues', 2) // [SUPPORTED]
  const u1_l2b = await seedLesson(u1_reading.id, 'وبعث النادي', 'The Club Was Established', 3) // [SUPPORTED]
  const u1_l3 = await seedLesson(u1_grammar.id, 'الجملة البسيطة', 'Simple Sentences', 1)
  const u1_l4 = await seedLesson(u1_grammar.id, 'حدود الجملة', 'Sentence Boundaries', 2)
  const u1_l5 = await seedLesson(u1_writing.id, 'كتابة فقرة قصيرة', 'Writing a Short Paragraph', 1)
  const u1_l6 = await seedLesson(u1_oral.id, 'وصف مشهد طبيعي', 'Describing a Natural Scene', 1)

  const u1_sk1 = await seedSkill(u1_l1.id, 'الفهم الشامل', 'Global Comprehension', 'reading')
  const u1_sk2 = await seedSkill(u1_l1.id, 'تحديد المعنى', 'Identifying Meaning', 'vocabulary')
  const u1_sk3 = await seedSkill(u1_l2.id, 'ترتيب الأحداث', 'Reordering Events', 'reading')
  const u1_sk3b = await seedSkill(u1_l2b.id, 'فهم النص والمناقشة', 'Text Comprehension and Discussion', 'reading') // [SUPPORTED]
  const u1_sk4 = await seedSkill(u1_l3.id, 'بناء الجملة البسيطة', 'Simple Sentence Structure', 'grammar')
  const u1_sk5 = await seedSkill(u1_l4.id, 'حدود الجملة', 'Sentence Boundaries', 'grammar')
  const u1_sk6 = await seedSkill(u1_l5.id, 'كتابة فقرة قصيرة', 'Writing a Short Paragraph', 'writing')
  const u1_sk7 = await seedSkill(u1_l6.id, 'وصف مشهد طبيعي شفويا', 'Oral Description of Nature', 'expression')

  // ===================================================================
  //  UNIT 2: العائلة والمجتمع [SUPPORTED]
  // ===================================================================
  const unit2 = await seedUnit(2, { name: 'Family and Community', nameAr: 'العائلة والمجتمع', themeAr: 'العائلة والمجتمع' })

  const u2_reading = await seedDomain(unit2.id, 'القراءة', 'Reading', 1)
  const u2_grammar = await seedDomain(unit2.id, 'قواعد اللغة', 'Grammar', 2)
  const u2_writing = await seedDomain(unit2.id, 'الإنتاج الكتابي', 'Writing', 3)
  const u2_oral = await seedDomain(unit2.id, 'التواصل الشفوي', 'Oral Communication', 4)

  const u2_l1 = await seedLesson(u2_reading.id, 'لقد أحياك حفيدك', 'Your Grandson Revived You', 1) // [SUPPORTED]
  const u2_l1b = await seedLesson(u2_reading.id, 'لنفكّر في مشروع ثان', 'Let Us Think of Another Project', 2) // [SUPPORTED]
  const u2_l2 = await seedLesson(u2_reading.id, 'لا نجاح دون تخطيط', 'No Success Without Planning', 3) // [SUPPORTED]
  const u2_l3 = await seedLesson(u2_grammar.id, 'المفرد والمثنى', 'Singular and Dual Forms', 1)
  const u2_l4 = await seedLesson(u2_writing.id, 'وصف شخصية', 'Describing a Character', 1)
  const u2_l5 = await seedLesson(u2_oral.id, 'تقديم فرد من العائلة', 'Introducing a Family Member', 1)

  const u2_sk1 = await seedSkill(u2_l1.id, 'فهم النص السردي', 'Narrative Comprehension', 'reading')
  const u2_sk2 = await seedSkill(u2_l1.id, 'تحديد الشخصيات', 'Identifying Characters', 'reading')
  const u2_sk2b = await seedSkill(u2_l1b.id, 'فهم النص والتحليل', 'Text Comprehension and Analysis', 'reading') // [SUPPORTED]
  const u2_sk3 = await seedSkill(u2_l2.id, 'فهم التخطيط والتنظيم', 'Understanding Planning and Organization', 'reading')
  const u2_sk4 = await seedSkill(u2_l3.id, 'المفرد والمثنى', 'Singular and Dual', 'grammar')
  const u2_sk5 = await seedSkill(u2_l4.id, 'وصف شخصية من العائلة', 'Character Description', 'writing')
  const u2_sk6 = await seedSkill(u2_l5.id, 'تقديم فرد من العائلة شفويا', 'Oral Presentation of Family', 'expression')

  // ===================================================================
  //  UNIT 3: الصحة والرفاه [SUPPORTED]
  // ===================================================================
  const unit3 = await seedUnit(3, { name: 'Health and Wellbeing', nameAr: 'الصحة والرفاه', themeAr: 'الصحة والرفاه' })

  const u3_reading = await seedDomain(unit3.id, 'القراءة', 'Reading', 1)
  const u3_grammar = await seedDomain(unit3.id, 'قواعد اللغة', 'Grammar', 2)
  const u3_writing = await seedDomain(unit3.id, 'الإنتاج الكتابي', 'Writing', 3)
  const u3_oral = await seedDomain(unit3.id, 'التواصل الشفوي', 'Oral Communication', 4)

  const u3_l1 = await seedLesson(u3_reading.id, 'كلها الآن بالشفاء', 'All Now Recovering', 1) // [SUPPORTED] — replaces invented "عادات صحية"
  const u3_l2 = await seedLesson(u3_grammar.id, 'الفعل المضارع', 'Present Tense', 1) // [VERIFIED]
  const u3_l3 = await seedLesson(u3_grammar.id, 'مؤشرات الزمن', 'Time Indicators', 2) // [SUPPORTED]
  const u3_l4 = await seedLesson(u3_reading.id, 'أقترح عزلهن', 'I Suggest Isolating Them', 2) // [SUPPORTED] — replaces invented "زيارة الطبيب"
  const u3_l5 = await seedLesson(u3_writing.id, 'كتابة نصائح صحية', 'Writing Health Advice', 1)
  const u3_l6 = await seedLesson(u3_oral.id, 'التعبير عن العادات اليومية', 'Talking About Daily Habits', 1)

  const u3_sk1 = await seedSkill(u3_l1.id, 'فهم المقروء', 'Reading Comprehension', 'reading')
  const u3_sk2 = await seedSkill(u3_l2.id, 'تصريف الفعل المضارع', 'Present Tense Conjugation', 'grammar')
  const u3_sk3 = await seedSkill(u3_l3.id, 'مؤشرات الزمن', 'Time Indicators', 'grammar')
  const u3_sk4 = await seedSkill(u3_l4.id, 'استخراج المعلومات من النص', 'Extracting Information from Text', 'reading')
  const u3_sk5 = await seedSkill(u3_l5.id, 'كتابة نص إرشادي', 'Writing Instructional Text', 'writing')
  const u3_sk6 = await seedSkill(u3_l6.id, 'التحدث عن الروتين اليومي', 'Talking About Daily Routine', 'expression')

  // ===================================================================
  //  UNIT 4: ما أحلى الوطن [SUPPORTED]
  // ===================================================================
  const unit4 = await seedUnit(4, { name: 'My Beautiful Homeland', nameAr: 'ما أحلى الوطن', themeAr: 'الوطن', descriptionAr: 'محور الوطن' })

  const u4_reading = await seedDomain(unit4.id, 'القراءة', 'Reading', 1)
  const u4_grammar = await seedDomain(unit4.id, 'قواعد اللغة', 'Grammar', 2)
  const u4_writing = await seedDomain(unit4.id, 'الإنتاج الكتابي', 'Writing', 3)
  const u4_oral = await seedDomain(unit4.id, 'التواصل الشفوي', 'Oral Communication', 4)

  const u4_l1 = await seedLesson(u4_reading.id, 'ما أحلى الوطن', 'How Beautiful is the Homeland', 1) // [SUPPORTED]
  const u4_l2 = await seedLesson(u4_grammar.id, 'الحوار في السرد', 'Dialogue in Narrative', 1) // [SUPPORTED]
  const u4_l3 = await seedLesson(u4_reading.id, 'يد واحدة لا تصفق', 'One Hand Does Not Clap', 2) // [SUPPORTED] — replaces invented "بلادي الجميلة"
  const u4_l3b = await seedLesson(u4_reading.id, 'من أجواء العيد', 'Holiday Atmosphere', 3) // [SUPPORTED]
  const u4_l4 = await seedLesson(u4_grammar.id, 'الفعل الماضي', 'Past Tense', 2) // [VERIFIED]
  const u4_l5 = await seedLesson(u4_writing.id, 'كتابة بطاقة بريدية', 'Writing a Postcard', 1)
  const u4_l6 = await seedLesson(u4_oral.id, 'وصف مكان أحبه', 'Describing a Place I Love', 1)

  const u4_sk1 = await seedSkill(u4_l1.id, 'الشخصيات والأحداث', 'Characters and Events', 'reading')
  const u4_sk2 = await seedSkill(u4_l1.id, 'الزمان والمكان', 'Time and Place', 'reading')
  const u4_sk3 = await seedSkill(u4_l2.id, 'الحوار', 'Dialogue', 'grammar')
  const u4_sk4 = await seedSkill(u4_l3.id, 'استخراج القيم من النص', 'Extracting Values from Text', 'reading')
  const u4_sk4b = await seedSkill(u4_l3b.id, 'فهم النص الوصفي', 'Descriptive Text Comprehension', 'reading') // [SUPPORTED]
  const u4_sk5 = await seedSkill(u4_l4.id, 'تصريف الفعل الماضي', 'Past Tense Conjugation', 'grammar')
  const u4_sk6 = await seedSkill(u4_l5.id, 'كتابة بطاقة بريدية عن الوطن', 'Postcard Writing', 'writing')
  const u4_sk7 = await seedSkill(u4_l6.id, 'وصف مكان شفويا', 'Oral Place Description', 'expression')

  // ===================================================================
  //  UNIT 5: العمل والترفيه [SUPPORTED]
  // ===================================================================
  const unit5 = await seedUnit(5, { name: 'Work and Leisure', nameAr: 'العمل والترفيه', themeAr: 'العمل والترفيه' })

  const u5_reading = await seedDomain(unit5.id, 'القراءة', 'Reading', 1)
  const u5_grammar = await seedDomain(unit5.id, 'قواعد اللغة', 'Grammar', 2)
  const u5_writing = await seedDomain(unit5.id, 'الإنتاج الكتابي', 'Writing', 3)
  const u5_oral = await seedDomain(unit5.id, 'التواصل الشفوي', 'Oral Communication', 4)

  const u5_l1 = await seedLesson(u5_reading.id, 'هديّتي من عرق جبينك', 'My Gift from the Sweat of Your Brow', 1) // [VERIFIED] — ينابيع textbook TOC p.87
  const u5_l2 = await seedLesson(u5_reading.id, 'أبحث عن دُرَرِه', 'I Search for His Pearls', 2) // [VERIFIED] — ينابيع textbook TOC p.90
  const u5_l3 = await seedLesson(u5_grammar.id, 'الجملة الفعلية', 'Verbal Sentence', 1) // [VERIFIED]
  const u5_l4 = await seedLesson(u5_grammar.id, 'أسماء الإشارة', 'Demonstratives', 2) // [VERIFIED]
  const u5_l5 = await seedLesson(u5_writing.id, 'كتابة قصة', 'Writing a Story', 1)
  const u5_l6 = await seedLesson(u5_oral.id, 'التحدث عن المهن', 'Talking About Professions', 1)

  const u5_sk1 = await seedSkill(u5_l3.id, 'بناء الجملة الفعلية: فعل + فاعل + مفعول به', 'Verbal Sentence Structure', 'grammar')
  const u5_sk2 = await seedSkill(u5_l4.id, 'أسماء الإشارة: هذا، ذلك، هؤلاء، أولئك', 'Demonstratives', 'grammar')
  const u5_sk3 = await seedSkill(u5_l5.id, 'كتابة قصة قصيرة', 'Story Writing', 'writing')
  const u5_sk4 = await seedSkill(u5_l1.id, 'فهم نص وصفي', 'Descriptive Text Comprehension', 'reading')
  const u5_sk5 = await seedSkill(u5_l2.id, 'تحديد الفكرة الرئيسية', 'Identifying Main Idea', 'reading')
  const u5_sk6 = await seedSkill(u5_l6.id, 'التعبير عن مهنة المستقبل', 'Expressing Future Career', 'expression')

  // ===================================================================
  //  UNIT 6: السلم والتسامح [SUPPORTED]
  // ===================================================================
  const unit6 = await seedUnit(6, { name: 'Peace and Tolerance', nameAr: 'السلم والتسامح', themeAr: 'السلم والتسامح' })

  const u6_reading = await seedDomain(unit6.id, 'القراءة', 'Reading', 1)
  const u6_grammar = await seedDomain(unit6.id, 'قواعد اللغة', 'Grammar', 2)
  const u6_writing = await seedDomain(unit6.id, 'الإنتاج الكتابي', 'Writing', 3)
  const u6_oral = await seedDomain(unit6.id, 'التواصل الشفوي', 'Oral Communication', 4)

  const u6_l1 = await seedLesson(u6_reading.id, 'صالحت أصدقائي', 'I Made Up With My Friends', 1) // [SUPPORTED]
  const u6_l2 = await seedLesson(u6_grammar.id, 'الجملة الاسمية', 'Nominal Sentence', 1) // [VERIFIED]
  const u6_l3 = await seedLesson(u6_grammar.id, 'الأسماء الموصولة', 'Relative Pronouns', 2) // [VERIFIED]
  const u6_l4 = await seedLesson(u6_reading.id, 'نهر السلم', 'River of Peace', 2) // [SUPPORTED] — replaces invented "درس في التسامح"
  const u6_l4b = await seedLesson(u6_reading.id, 'لغة واحدة', 'One Language', 3) // [SUPPORTED]
  const u6_l5 = await seedLesson(u6_writing.id, 'كتابة رسالة اعتذار', 'Writing an Apology Letter', 1)
  const u6_l6 = await seedLesson(u6_oral.id, 'التعبير عن المشاعر', 'Expressing Feelings', 1)

  const u6_sk1 = await seedSkill(u6_l1.id, 'البنية السردية', 'Narrative Structure', 'reading')
  const u6_sk2 = await seedSkill(u6_l2.id, 'مكونات الجملة الاسمية: المبتدأ والخبر', 'Nominal Sentence Components', 'grammar')
  const u6_sk3 = await seedSkill(u6_l3.id, 'الأسماء الموصولة', 'Relative Pronouns', 'grammar')
  const u6_sk4 = await seedSkill(u6_l4.id, 'تحديد القيم الأخلاقية', 'Identifying Moral Values', 'reading')
  const u6_sk4b = await seedSkill(u6_l4b.id, 'فهم النص والمقارنة', 'Text Comprehension and Comparison', 'reading') // [SUPPORTED]
  const u6_sk5 = await seedSkill(u6_l5.id, 'كتابة رسالة قصيرة', 'Short Letter Writing', 'writing')
  const u6_sk6 = await seedSkill(u6_l6.id, 'التعبير الشفوي عن المشاعر', 'Oral Expression of Feelings', 'expression')

  // ===================================================================
  //  UNIT 7: وسائل الإعلام والاتصال [SUPPORTED]
  // ===================================================================
  const unit7 = await seedUnit(7, { name: 'Media and Communication', nameAr: 'وسائل الإعلام والاتصال', themeAr: 'وسائل الإعلام والاتصال' })

  const u7_reading = await seedDomain(unit7.id, 'القراءة', 'Reading', 1)
  const u7_grammar = await seedDomain(unit7.id, 'قواعد اللغة', 'Grammar', 2)
  const u7_writing = await seedDomain(unit7.id, 'الإنتاج الكتابي', 'Writing', 3)
  const u7_oral = await seedDomain(unit7.id, 'التواصل الشفوي', 'Oral Communication', 4)

  const u7_l1 = await seedLesson(u7_reading.id, 'سلمى والمجلات', 'Salma and the Magazines', 1) // [SUPPORTED]
  const u7_l2 = await seedLesson(u7_grammar.id, 'أفعال القول وعلامات الترقيم', 'Speech Verbs and Punctuation', 1) // [SUPPORTED]
  const u7_l3 = await seedLesson(u7_reading.id, 'عش العصافير', 'The Birds Nest', 2) // [SUPPORTED] — replaces invented "رسالة إلى صديق"
  const u7_l3b = await seedLesson(u7_reading.id, 'لا بل ينابيع', 'No, Rather Springs', 3) // [SUPPORTED]
  const u7_l4 = await seedLesson(u7_grammar.id, 'النعت', 'The Adjective', 2) // [SUPPORTED]
  const u7_l5 = await seedLesson(u7_writing.id, 'كتابة حوار', 'Writing a Dialogue', 1)
  const u7_l6 = await seedLesson(u7_oral.id, 'تقديم عرض شفوي', 'Presenting to Peers', 1)

  const u7_sk1 = await seedSkill(u7_l1.id, 'الفكرة الرئيسية والأفكار الثانوية', 'Main and Secondary Ideas', 'reading')
  const u7_sk2 = await seedSkill(u7_l1.id, 'الفهم النقدي', 'Critical Comprehension', 'reading')
  const u7_sk3 = await seedSkill(u7_l2.id, 'أفعال القول وعلامات الترقيم', 'Speech Verbs and Punctuation', 'grammar')
  const u7_sk4 = await seedSkill(u7_l3.id, 'فهم أنواع النصوص', 'Understanding Text Types', 'reading')
  const u7_sk4b = await seedSkill(u7_l3b.id, 'تحديد الفكرة الأساسية والأفكار الفرعية', 'Main and Supporting Ideas', 'reading') // [SUPPORTED]
  const u7_sk5 = await seedSkill(u7_l4.id, 'النعت والمنعوت', 'Adjective Agreement', 'grammar')
  const u7_sk6 = await seedSkill(u7_l5.id, 'كتابة حوار قصير', 'Short Dialogue Writing', 'writing')
  const u7_sk7 = await seedSkill(u7_l6.id, 'تقديم موضوع أمام الأقران', 'Peer Presentation', 'expression')

  // ===================================================================
  //  UNIT 8: الاتصال والتكنولوجيا [SUPPORTED]
  // ===================================================================
  const unit8 = await seedUnit(8, { name: 'Communication and Technology', nameAr: 'الاتصال والتكنولوجيا', themeAr: 'الاتصال والتكنولوجيا' })

  const u8_reading = await seedDomain(unit8.id, 'القراءة', 'Reading', 1)
  const u8_grammar = await seedDomain(unit8.id, 'قواعد اللغة', 'Grammar', 2)
  const u8_writing = await seedDomain(unit8.id, 'الإنتاج الكتابي', 'Writing', 3)
  const u8_oral = await seedDomain(unit8.id, 'التواصل الشفوي', 'Oral Communication', 4)

  const u8_l1 = await seedLesson(u8_reading.id, 'فلنكن نحن الأفضل', 'Let Us Be the Best', 1) // [VERIFIED] — ينابيع textbook TOC p.146
  const u8_l2 = await seedLesson(u8_reading.id, 'بين جوال وقار', 'Between Mobile and Dignity', 2) // [VERIFIED] — ينابيع textbook TOC p.148
  const u8_l3 = await seedLesson(u8_grammar.id, 'صيغة النهي', 'Prohibition Form', 1) // [VERIFIED]
  const u8_l4 = await seedLesson(u8_grammar.id, 'مراجعة عامة', 'General Review', 2) // [SUPPORTED]
  const u8_l5 = await seedLesson(u8_writing.id, 'كتابة نص وصفي', 'Writing a Descriptive Text', 1) // [STRUCTURE]
  const u8_l6 = await seedLesson(u8_oral.id, 'التعبير عن المشاعر', 'Emotional Expression', 1) // [STRUCTURE]

  const u8_sk1 = await seedSkill(u8_l1.id, 'فهم نص معلوماتي', 'Informational Text Comprehension', 'reading')
  const u8_sk2 = await seedSkill(u8_l2.id, 'المقارنة بين المعلومات', 'Comparing Information', 'reading')
  const u8_sk3 = await seedSkill(u8_l3.id, 'صيغة النهي', 'Prohibition Form', 'grammar')
  const u8_sk4 = await seedSkill(u8_l4.id, 'التمييز بين أنواع الجمل', 'Distinguishing Sentence Types', 'grammar')
  const u8_sk5 = await seedSkill(u8_l5.id, 'كتابة نص وصفي قصير', 'Short Descriptive Writing', 'writing')
  const u8_sk6 = await seedSkill(u8_l6.id, 'التعبير عن المشاعر والطلب والأدب', 'Emotional Expression', 'expression')

  // Cleanup: remove stale skill from prior seed versions (had 0 activities/results)
  const staleSkill = await prisma.skill.findFirst({ where: { nameAr: 'ترتيب أحداث القصة', lesson: { domain: { unit: { nameAr: 'العائلة والمجتمع' } } } } })
  if (staleSkill) {
    await prisma.skill.delete({ where: { id: staleSkill.id } })
    console.log('🧹 Removed stale skill: ترتيب أحداث القصة')
  }

  console.log('✅ 8 units × 4 domains — curriculum complete')

  // ============== ACTIVITIES & QUESTIONS ==============

  const act1 = await seedActivity(u1_sk1.id, 'فهم المقروء - الوحدة الأولى', {
    title: 'Reading Comprehension - Unit 1', titleAr: 'فهم المقروء - الوحدة الأولى',
    description: 'Comprehension quiz about the first reading text', descriptionAr: 'اختبار فهم حول نص القراءة الأول',
    gameType: 'quiz', difficulty: 'easy', timeLimit: 30, points: 10,
    skillId: u1_sk1.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act1.id, [
    { activityId: act1.id, orderIndex: 0, questionText: 'ما الفكرة الرئيسية في النص؟', questionType: 'quiz', data: JSON.stringify({ type: 'quiz', options: [{ id: 'q1o1', text: 'الحرية نعمة عظيمة' }, { id: 'q1o2', text: 'الطبيعة جميلة' }, { id: 'q1o3', text: 'الحيوانات تحب اللعب' }, { id: 'q1o4', text: 'المدرسة ممتعة' }], correctOptionId: 'q1o1' }), explanation: 'الفكرة الرئيسية هي أن الحرية نعمة عظيمة يجب أن نحافظ عليها', points: 10 },
    { activityId: act1.id, orderIndex: 1, questionText: 'من هي الشخصية الرئيسية في القصة؟', questionType: 'quiz', data: JSON.stringify({ type: 'quiz', options: [{ id: 'q2o1', text: 'العصفور' }, { id: 'q2o2', text: 'القط' }, { id: 'q2o3', text: 'الطفل' }, { id: 'q2o4', text: 'المعلمة' }], correctOptionId: 'q2o1' }), explanation: 'الشخصية الرئيسية هي العصفور الذي يبحث عن الحرية', points: 10 },
    { activityId: act1.id, orderIndex: 2, questionText: 'أين تدور أحداث القصة؟', questionType: 'quiz', data: JSON.stringify({ type: 'quiz', options: [{ id: 'q3o1', text: 'في الغابة' }, { id: 'q3o2', text: 'في المدرسة' }, { id: 'q3o3', text: 'في البيت' }, { id: 'q3o4', text: 'في السوق' }], correctOptionId: 'q3o1' }), points: 10 },
    { activityId: act1.id, orderIndex: 3, questionText: 'ماذا تعني كلمة "تنعم"؟', questionType: 'quiz', data: JSON.stringify({ type: 'quiz', options: [{ id: 'q4o1', text: 'تتمتع وتسعد' }, { id: 'q4o2', text: 'تحزن' }, { id: 'q4o3', text: 'تنام' }, { id: 'q4o4', text: 'تأكل' }], correctOptionId: 'q4o1' }), explanation: 'تنعم تعني تتمتع وتسعد بشيء ما', points: 10 },
    { activityId: act1.id, orderIndex: 4, questionText: 'ما هو الدرس المستفاد من القصة؟', questionType: 'quiz', data: JSON.stringify({ type: 'quiz', options: [{ id: 'q5o1', text: 'الحرية أغلى ما نملك' }, { id: 'q5o2', text: 'يجب أن نأكل كثيرا' }, { id: 'q5o3', text: 'النوم مفيد للصحة' }, { id: 'q5o4', text: 'المدرسة مملة' }], correctOptionId: 'q5o1' }), points: 10 },
  ])

  const act2 = await seedActivity(u1_sk3.id, 'صح أو خطأ - وهكذا تستمر الحياة', {
    title: 'True or False - Life Continues', titleAr: 'صح أو خطأ - وهكذا تستمر الحياة',
    gameType: 'true_false', difficulty: 'easy', timeLimit: 20, points: 10,
    skillId: u1_sk3.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act2.id, [
    { activityId: act2.id, orderIndex: 0, questionText: 'الشجرة تنمو من البذرة', questionType: 'true_false', data: JSON.stringify({ type: 'true_false', statement: 'الشجرة تنمو من البذرة', correctAnswer: true }), points: 10 },
    { activityId: act2.id, orderIndex: 1, questionText: 'الماء ليس ضروريا لنمو النبات', questionType: 'true_false', data: JSON.stringify({ type: 'true_false', statement: 'الماء ليس ضروريا لنمو النبات', correctAnswer: false }), explanation: 'الماء ضروري جدا لنمو النبات', points: 10 },
    { activityId: act2.id, orderIndex: 2, questionText: 'الشمس تساعد النبات على النمو', questionType: 'true_false', data: JSON.stringify({ type: 'true_false', statement: 'الشمس تساعد النبات على النمو', correctAnswer: true }), points: 10 },
    { activityId: act2.id, orderIndex: 3, questionText: 'الحيوانات لا تحتاج إلى الغذاء', questionType: 'true_false', data: JSON.stringify({ type: 'true_false', statement: 'الحيوانات لا تحتاج إلى الغذاء', correctAnswer: false }), explanation: 'جميع الكائنات الحية تحتاج إلى الغذاء', points: 10 },
    { activityId: act2.id, orderIndex: 4, questionText: 'دورة الحياة تتكرر باستمرار', questionType: 'true_false', data: JSON.stringify({ type: 'true_false', statement: 'دورة الحياة تتكرر باستمرار', correctAnswer: true }), points: 10 },
  ])

  const act3 = await seedActivity(u1_sk2.id, 'مطابقة المفردات - الوحدة الأولى', {
    title: 'Vocabulary Matching - Unit 1', titleAr: 'مطابقة المفردات - الوحدة الأولى',
    gameType: 'matching', difficulty: 'easy', timeLimit: 60, points: 10,
    skillId: u1_sk2.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act3.id, [
    { activityId: act3.id, orderIndex: 0, questionText: 'طابق الكلمة بمعناها', questionType: 'matching', data: JSON.stringify({ type: 'matching', pairs: [{ id: 'p1', left: 'حرية', right: 'عدم التقيد' }, { id: 'p2', left: 'طبيعة', right: 'البيئة من حولنا' }, { id: 'p3', left: 'نعمة', right: 'شيء جميل نحمد الله عليه' }, { id: 'p4', left: 'تستمر', right: 'لا تتوقف' }] }), points: 10 },
    { activityId: act3.id, orderIndex: 1, questionText: 'طابق الكلمة بضدها', questionType: 'matching', data: JSON.stringify({ type: 'matching', pairs: [{ id: 'p5', left: 'كبير', right: 'صغير' }, { id: 'p6', left: 'سعيد', right: 'حزين' }, { id: 'p7', left: 'طويل', right: 'قصير' }, { id: 'p8', left: 'سريع', right: 'بطيء' }] }), points: 10 },
  ])

  const act4 = await seedActivity(u1_sk4.id, 'رتّب الجملة - الجمل البسيطة', {
    title: 'Build the Sentence - Simple Sentences', titleAr: 'رتّب الجملة - الجمل البسيطة',
    gameType: 'sentence_builder', difficulty: 'medium', timeLimit: 45, points: 10,
    skillId: u1_sk4.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act4.id, [
    { activityId: act4.id, orderIndex: 0, questionText: 'رتّب الكلمات لتكوّن جملة مفيدة', questionType: 'sentence_builder', data: JSON.stringify({ type: 'sentence_builder', words: ['يلعب', 'الطفل', 'في', 'الحديقة'], correctOrder: ['الطفل', 'يلعب', 'في', 'الحديقة'] }), explanation: 'الجملة الصحيحة: الطفل يلعب في الحديقة', points: 10 },
    { activityId: act4.id, orderIndex: 1, questionText: 'رتّب الكلمات لتكوّن جملة مفيدة', questionType: 'sentence_builder', data: JSON.stringify({ type: 'sentence_builder', words: ['تأكل', 'القطة', 'السمك'], correctOrder: ['القطة', 'تأكل', 'السمك'] }), explanation: 'الجملة الصحيحة: القطة تأكل السمك', points: 10 },
    { activityId: act4.id, orderIndex: 2, questionText: 'رتّب الكلمات لتكوّن جملة مفيدة', questionType: 'sentence_builder', data: JSON.stringify({ type: 'sentence_builder', words: ['ذهب', 'أحمد', 'إلى', 'المدرسة', 'صباحا'], correctOrder: ['ذهب', 'أحمد', 'إلى', 'المدرسة', 'صباحا'] }), points: 10 },
    { activityId: act4.id, orderIndex: 3, questionText: 'رتّب الكلمات لتكوّن جملة مفيدة', questionType: 'sentence_builder', data: JSON.stringify({ type: 'sentence_builder', words: ['جميلة', 'الطبيعة'], correctOrder: ['الطبيعة', 'جميلة'], hint: 'جملة اسمية تبدأ باسم' }), explanation: 'الجملة الصحيحة: الطبيعة جميلة (جملة اسمية)', points: 10 },
  ])

  const act5 = await seedActivity(u6_sk1.id, 'رتّب القصة - السلم والتسامح', {
    title: 'Order the Story - Peace and Tolerance', titleAr: 'رتّب القصة - السلم والتسامح',
    gameType: 'order_story', difficulty: 'medium', timeLimit: 60, points: 10,
    skillId: u6_sk1.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act5.id, [
    { activityId: act5.id, orderIndex: 0, questionText: 'رتّب أحداث القصة حسب تسلسلها الصحيح', questionType: 'order_story', data: JSON.stringify({ type: 'order_story', items: [{ id: 's1', text: 'تشاجر سامي مع صديقه أحمد في المدرسة' }, { id: 's2', text: 'شعر سامي بالحزن لأنه فقد صديقه' }, { id: 's3', text: 'نصحت المعلمة سامي بأن يعتذر لأحمد' }, { id: 's4', text: 'اعتذر سامي لأحمد وعادا صديقين' }], correctOrder: ['s1', 's2', 's3', 's4'] }), points: 10 },
    { activityId: act5.id, orderIndex: 1, questionText: 'رتّب أحداث القصة حسب تسلسلها الصحيح', questionType: 'order_story', data: JSON.stringify({ type: 'order_story', items: [{ id: 's5', text: 'استيقظ الطفل صباحا مبكرا' }, { id: 's6', text: 'غسل وجهه وارتدى ملابسه' }, { id: 's7', text: 'تناول فطوره مع عائلته' }, { id: 's8', text: 'ذهب إلى المدرسة سعيدا' }], correctOrder: ['s5', 's6', 's7', 's8'] }), points: 10 },
  ])

  const act6 = await seedActivity(u6_sk2.id, 'محقق القواعد - أنواع الجمل', {
    title: 'Grammar Detective - Sentence Types', titleAr: 'محقق القواعد - أنواع الجمل',
    gameType: 'grammar_detective', difficulty: 'medium', timeLimit: 45, points: 10,
    skillId: u6_sk2.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act6.id, [
    { activityId: act6.id, orderIndex: 0, questionText: 'حدد العناصر النحوية في الجملة: "الشمس ساطعة"', questionType: 'grammar_detective', data: JSON.stringify({ type: 'grammar_detective', sentence: 'الشمس ساطعة', targets: [{ id: 't1', text: 'الشمس', startIndex: 0, endIndex: 5, label: 'مبتدأ' }, { id: 't2', text: 'ساطعة', startIndex: 6, endIndex: 11, label: 'خبر' }], availableLabels: ['مبتدأ', 'خبر', 'فعل', 'فاعل'] }), explanation: 'الشمس = مبتدأ، ساطعة = خبر', points: 10 },
    { activityId: act6.id, orderIndex: 1, questionText: 'حدد العناصر النحوية في الجملة: "يلعب الأطفال في الساحة"', questionType: 'grammar_detective', data: JSON.stringify({ type: 'grammar_detective', sentence: 'يلعب الأطفال في الساحة', targets: [{ id: 't3', text: 'يلعب', startIndex: 0, endIndex: 4, label: 'فعل' }, { id: 't4', text: 'الأطفال', startIndex: 5, endIndex: 12, label: 'فاعل' }], availableLabels: ['مبتدأ', 'خبر', 'فعل', 'فاعل'] }), explanation: 'يلعب = فعل مضارع، الأطفال = فاعل', points: 10 },
    { activityId: act6.id, orderIndex: 2, questionText: 'حدد العناصر النحوية في الجملة: "كتبت سارة الدرس"', questionType: 'grammar_detective', data: JSON.stringify({ type: 'grammar_detective', sentence: 'كتبت سارة الدرس', targets: [{ id: 't5', text: 'كتبت', startIndex: 0, endIndex: 4, label: 'فعل' }, { id: 't6', text: 'سارة', startIndex: 5, endIndex: 9, label: 'فاعل' }, { id: 't7', text: 'الدرس', startIndex: 10, endIndex: 15, label: 'مفعول به' }], availableLabels: ['فعل', 'فاعل', 'مفعول به', 'مبتدأ'] }), explanation: 'كتبت = فعل ماضي، سارة = فاعل، الدرس = مفعول به', points: 10 },
  ])

  const act7 = await seedActivity(u5_sk1.id, 'اكتشف الخطأ - قواعد اللغة', {
    title: 'Find the Mistake - Grammar', titleAr: 'اكتشف الخطأ - قواعد اللغة',
    gameType: 'find_mistake', difficulty: 'hard', timeLimit: 30, points: 15,
    skillId: u5_sk1.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act7.id, [
    { activityId: act7.id, orderIndex: 0, questionText: 'اكتشف الخطأ في الجملة التالية', questionType: 'find_mistake', data: JSON.stringify({ type: 'find_mistake', sentenceWithMistake: 'ذهبت الولد إلى المدرسة', correctedSentence: 'ذهب الولد إلى المدرسة', mistakeText: 'ذهبت', correctionText: 'ذهب', mistakeStartIndex: 0, mistakeEndIndex: 4 }), explanation: 'الصواب هو "ذهب" لأن الولد مذكر', points: 15 },
    { activityId: act7.id, orderIndex: 1, questionText: 'اكتشف الخطأ في الجملة التالية', questionType: 'find_mistake', data: JSON.stringify({ type: 'find_mistake', sentenceWithMistake: 'يلعبون البنات في الحديقة', correctedSentence: 'تلعب البنات في الحديقة', mistakeText: 'يلعبون', correctionText: 'تلعب', mistakeStartIndex: 0, mistakeEndIndex: 6 }), explanation: 'الصواب هو "تلعب" لأن البنات مؤنث', points: 15 },
    { activityId: act7.id, orderIndex: 2, questionText: 'اكتشف الخطأ في الجملة التالية', questionType: 'find_mistake', data: JSON.stringify({ type: 'find_mistake', sentenceWithMistake: 'أكل الطفل تفاحتان', correctedSentence: 'أكل الطفل تفاحتين', mistakeText: 'تفاحتان', correctionText: 'تفاحتين', mistakeStartIndex: 10, mistakeEndIndex: 17 }), explanation: 'الصواب هو "تفاحتين" لأن الكلمة مفعول به منصوب', points: 15 },
    { activityId: act7.id, orderIndex: 3, questionText: 'اكتشف الخطأ في الجملة التالية', questionType: 'find_mistake', data: JSON.stringify({ type: 'find_mistake', sentenceWithMistake: 'هذه كتاب جديد', correctedSentence: 'هذا كتاب جديد', mistakeText: 'هذه', correctionText: 'هذا', mistakeStartIndex: 0, mistakeEndIndex: 3 }), explanation: 'الصواب هو "هذا" لأن كتاب مذكر', points: 15 },
  ])

  const act8 = await seedActivity(u3_sk1.id, 'مفردات - الصحة والرفاه', {
    title: 'Vocabulary - Health and Wellbeing', titleAr: 'مفردات - الصحة والرفاه',
    gameType: 'vocabulary', difficulty: 'easy', timeLimit: 25, points: 10,
    skillId: u3_sk1.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act8.id, [
    { activityId: act8.id, orderIndex: 0, questionText: 'ما معنى كلمة "صحة"؟', questionType: 'vocabulary', data: JSON.stringify({ type: 'vocabulary', word: 'صحة', definition: 'سلامة الجسم والعقل من الأمراض', distractors: ['مرض', 'تعب', 'نوم'], format: 'definition' }), points: 10 },
    { activityId: act8.id, orderIndex: 1, questionText: 'ما معنى كلمة "غذاء"؟', questionType: 'vocabulary', data: JSON.stringify({ type: 'vocabulary', word: 'غذاء', definition: 'الطعام الذي نأكله لنحصل على الطاقة', distractors: ['ماء', 'هواء', 'ملابس'], format: 'definition' }), points: 10 },
    { activityId: act8.id, orderIndex: 2, questionText: 'ما معنى كلمة "رياضة"؟', questionType: 'vocabulary', data: JSON.stringify({ type: 'vocabulary', word: 'رياضة', definition: 'نشاط بدني لتقوية الجسم والحفاظ على الصحة', distractors: ['أكل', 'قراءة', 'نوم'], format: 'definition' }), points: 10 },
    { activityId: act8.id, orderIndex: 3, questionText: 'أكمل الجملة: النظافة من ___', questionType: 'vocabulary', data: JSON.stringify({ type: 'vocabulary', word: 'الإيمان', definition: 'التصديق والاعتقاد', distractors: ['الكسل', 'اللعب', 'النوم'], format: 'fill_blank', contextSentence: 'النظافة من ___' }), points: 10 },
    { activityId: act8.id, orderIndex: 4, questionText: 'ما معنى كلمة "نظافة"؟', questionType: 'vocabulary', data: JSON.stringify({ type: 'vocabulary', word: 'نظافة', definition: 'إزالة الأوساخ والحفاظ على الطهارة', distractors: ['فوضى', 'كسل', 'لعب'], format: 'definition' }), points: 10 },
  ])

  const act9 = await seedActivity(u2_sk1.id, 'اختبار فهم النص السردي', {
    title: 'Narrative Comprehension Quiz', titleAr: 'اختبار فهم النص السردي',
    gameType: 'quiz', difficulty: 'medium', timeLimit: 30, points: 10,
    skillId: u2_sk1.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act9.id, [
    { activityId: act9.id, orderIndex: 0, questionText: 'ما هو النص السردي؟', questionType: 'quiz', data: JSON.stringify({ type: 'quiz', options: [{ id: 'q9o1', text: 'نص يروي أحداثا وقصصا' }, { id: 'q9o2', text: 'نص يشرح قاعدة نحوية' }, { id: 'q9o3', text: 'نص يصف منظرا طبيعيا فقط' }, { id: 'q9o4', text: 'قائمة من الكلمات' }], correctOptionId: 'q9o1' }), points: 10 },
    { activityId: act9.id, orderIndex: 1, questionText: 'ما هي عناصر القصة؟', questionType: 'quiz', data: JSON.stringify({ type: 'quiz', options: [{ id: 'q10o1', text: 'شخصيات وأحداث ومكان وزمان' }, { id: 'q10o2', text: 'كلمات وحروف فقط' }, { id: 'q10o3', text: 'صور فقط' }, { id: 'q10o4', text: 'أرقام وجداول' }], correctOptionId: 'q10o1' }), points: 10 },
    { activityId: act9.id, orderIndex: 2, questionText: 'ما هو دور الشخصية الرئيسية في القصة؟', questionType: 'quiz', data: JSON.stringify({ type: 'quiz', options: [{ id: 'q11o1', text: 'هي محور الأحداث وتتطور معها' }, { id: 'q11o2', text: 'هي شخصية ثانوية' }, { id: 'q11o3', text: 'لا دور لها' }, { id: 'q11o4', text: 'هي الراوي فقط' }], correctOptionId: 'q11o1' }), points: 10 },
  ])

  const act10 = await seedActivity(u2_sk4.id, 'صح أو خطأ - المفرد والمثنى', {
    title: 'True or False - Singular and Dual', titleAr: 'صح أو خطأ - المفرد والمثنى',
    gameType: 'true_false', difficulty: 'medium', timeLimit: 20, points: 10,
    skillId: u2_sk4.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act10.id, [
    { activityId: act10.id, orderIndex: 0, questionText: 'مثنى "كتاب" هو "كتابان"', questionType: 'true_false', data: JSON.stringify({ type: 'true_false', statement: 'مثنى "كتاب" هو "كتابان"', correctAnswer: true }), points: 10 },
    { activityId: act10.id, orderIndex: 1, questionText: 'مثنى "معلم" هو "معلمون"', questionType: 'true_false', data: JSON.stringify({ type: 'true_false', statement: 'مثنى "معلم" هو "معلمون"', correctAnswer: false }), explanation: '"معلمون" جمع مذكر سالم وليس مثنى. المثنى هو "معلمان"', points: 10 },
    { activityId: act10.id, orderIndex: 2, questionText: 'المثنى يُرفع بالألف والنون', questionType: 'true_false', data: JSON.stringify({ type: 'true_false', statement: 'المثنى يُرفع بالألف والنون', correctAnswer: true }), points: 10 },
    { activityId: act10.id, orderIndex: 3, questionText: 'مثنى "طالبة" هو "طالبتين" في حالة الرفع', questionType: 'true_false', data: JSON.stringify({ type: 'true_false', statement: 'مثنى "طالبة" هو "طالبتين" في حالة الرفع', correctAnswer: false }), explanation: 'في حالة الرفع المثنى هو "طالبتان"، أما "طالبتين" فهي في حالة النصب والجر', points: 10 },
  ])

  const act11 = await seedActivity(u3_sk2.id, 'مطابقة - تصريف المضارع', {
    title: 'Matching - Present Tense', titleAr: 'مطابقة - تصريف المضارع',
    gameType: 'matching', difficulty: 'medium', timeLimit: 60, points: 10,
    skillId: u3_sk2.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act11.id, [
    { activityId: act11.id, orderIndex: 0, questionText: 'طابق الفعل بتصريفه الصحيح', questionType: 'matching', data: JSON.stringify({ type: 'matching', pairs: [{ id: 'v1', left: 'أنا', right: 'أكتبُ' }, { id: 'v2', left: 'أنتَ', right: 'تكتبُ' }, { id: 'v3', left: 'هو', right: 'يكتبُ' }, { id: 'v4', left: 'هي', right: 'تكتبُ' }, { id: 'v5', left: 'نحن', right: 'نكتبُ' }] }), points: 10 },
    { activityId: act11.id, orderIndex: 1, questionText: 'طابق الفعل المضارع بالماضي', questionType: 'matching', data: JSON.stringify({ type: 'matching', pairs: [{ id: 'v6', left: 'يذهبُ', right: 'ذهبَ' }, { id: 'v7', left: 'يأكلُ', right: 'أكلَ' }, { id: 'v8', left: 'يقرأُ', right: 'قرأَ' }, { id: 'v9', left: 'يكتبُ', right: 'كتبَ' }] }), points: 10 },
  ])

  const act12 = await seedActivity(u5_sk1.id, 'رتّب الجملة الفعلية', {
    title: 'Build the Sentence - Verbal Sentences', titleAr: 'رتّب الجملة الفعلية',
    gameType: 'sentence_builder', difficulty: 'hard', timeLimit: 45, points: 10,
    skillId: u5_sk1.id, createdBy: teacher.id, status: 'published',
  })
  await seedQuestions(act12.id, [
    { activityId: act12.id, orderIndex: 0, questionText: 'رتّب الكلمات لتكوّن جملة فعلية صحيحة', questionType: 'sentence_builder', data: JSON.stringify({ type: 'sentence_builder', words: ['الدرسَ', 'كتبَ', 'التلميذُ'], correctOrder: ['كتبَ', 'التلميذُ', 'الدرسَ'], hint: 'الجملة الفعلية: فعل + فاعل + مفعول به' }), points: 10 },
    { activityId: act12.id, orderIndex: 1, questionText: 'رتّب الكلمات لتكوّن جملة فعلية صحيحة', questionType: 'sentence_builder', data: JSON.stringify({ type: 'sentence_builder', words: ['القصةَ', 'المعلمةُ', 'قرأت'], correctOrder: ['قرأت', 'المعلمةُ', 'القصةَ'], hint: 'فعل + فاعل + مفعول به' }), points: 10 },
    { activityId: act12.id, orderIndex: 2, questionText: 'رتّب الكلمات لتكوّن جملة فعلية صحيحة', questionType: 'sentence_builder', data: JSON.stringify({ type: 'sentence_builder', words: ['في', 'يسبحُ', 'البحرِ', 'السمكُ'], correctOrder: ['يسبحُ', 'السمكُ', 'في', 'البحرِ'] }), points: 10 },
  ])

  // ============== SUMMARY ==============
  const counts = {
    units: await prisma.unit.count(),
    domains: await prisma.domain.count(),
    lessons: await prisma.lesson.count(),
    skills: await prisma.skill.count(),
    activities: await prisma.activity.count(),
    questions: await prisma.question.count(),
  }
  console.log(`\n📊 Curriculum: ${counts.units} units, ${counts.domains} domains, ${counts.lessons} lessons, ${counts.skills} skills`)
  console.log(`📊 Content: ${counts.activities} activities, ${counts.questions} questions`)
  console.log('\n🎉 Seed complete!')
  console.log('📧 Teacher login: teacher@fontaine.tn')
  console.log('🔑 Password: fontaine2026')
  console.log(`👨‍🎓 Class: ${classA.name} (Code: ${classA.joinCode})`)
  console.log(`📚 ${students.length} students enrolled`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
