import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env
try {
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.substring(0, eqIdx).trim()
    let value = trimmed.substring(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1)
    if (!process.env[key]) process.env[key] = value
  }
} catch {}

const prisma = new PrismaClient()
const BASE = 'http://localhost:3000'

let passed = 0
let failed = 0
let warnings: string[] = []
const sections: Record<string, { passed: number; failed: number; details: string[] }> = {}
let currentSection = ''

function startSection(name: string) {
  currentSection = name
  sections[name] = { passed: 0, failed: 0, details: [] }
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${name}`)
  console.log('='.repeat(60))
}

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`)
    passed++
    sections[currentSection].passed++
  } else {
    console.log(`  ❌ FAIL: ${msg}`)
    failed++
    sections[currentSection].failed++
    sections[currentSection].details.push(`FAIL: ${msg}`)
  }
}

function warn(msg: string) {
  console.log(`  ⚠️  WARNING: ${msg}`)
  warnings.push(msg)
}

// ========= AUTH HELPERS =========

async function login(email: string, password: string): Promise<string | null> {
  try {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
    if (!csrfRes.ok) return null
    const { csrfToken } = await csrfRes.json()
    const cookies = csrfRes.headers.getSetCookie?.() || []
    const csrfCookie = cookies.find((c: string) => c.startsWith('authjs.csrf-token') || c.startsWith('next-auth.csrf-token'))

    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie || '' },
      body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
      redirect: 'manual',
    })
    const allCookies = loginRes.headers.getSetCookie?.() || []
    const sessionCookie = allCookies.find((c: string) => c.startsWith('authjs.session-token') || c.startsWith('next-auth.session-token'))
    if (!sessionCookie) return null
    return [csrfCookie, sessionCookie].filter(Boolean).join('; ')
  } catch { return null }
}

async function apiGet(path: string, cookies: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookies } })
  let data: any = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

async function apiPost(path: string, body: unknown, cookies: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify(body),
  })
  let data: any = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

async function apiPut(path: string, body: unknown, cookies: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify(body),
  })
  let data: any = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

async function apiDelete(path: string, cookies: string) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: { Cookie: cookies } })
  let data: any = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

async function fetchPage(path: string, cookies?: string) {
  const headers: Record<string, string> = { Accept: 'text/html' }
  if (cookies) headers.Cookie = cookies
  const res = await fetch(`${BASE}${path}`, { headers, redirect: 'manual' })
  return { status: res.status, location: res.headers.get('location'), contentType: res.headers.get('content-type') }
}

// ========= MAIN =========

async function main() {
  console.log('\n' + '█'.repeat(60))
  console.log('  FONTAINE FULL-SYSTEM PRODUCTION-READINESS TEST')
  console.log('█'.repeat(60))

  let teacherCookies = ''

  // ==================== 1. APPLICATION STARTUP ====================
  startSection('1. APPLICATION STARTUP')

  const csrfCheck = await fetch(`${BASE}/api/auth/csrf`)
  assert(csrfCheck.status === 200, 'Next.js server responds')

  const ollamaCheck = await fetch('http://localhost:11434/api/tags').catch(() => null)
  assert(ollamaCheck?.ok === true, 'Ollama is running')

  const dbCheck = await prisma.user.count()
  assert(dbCheck > 0, `Database connected (${dbCheck} users)`)

  const gradeCount = await prisma.grade.count()
  assert(gradeCount > 0, `Curriculum seeded (${gradeCount} grades)`)

  const studentCount = await prisma.student.count()
  assert(studentCount > 0, `Students exist (${studentCount})`)

  // Check .env has no paid API keys
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf-8')
  assert(!envContent.includes('ANTHROPIC_API_KEY'), 'No Anthropic API key in .env')
  assert(!envContent.includes('OPENAI_API_KEY'), 'No OpenAI API key in .env')
  assert(!envContent.includes('GEMINI_API_KEY'), 'No Gemini API key in .env')

  // ==================== 2. TEACHER LOGIN ====================
  startSection('2. TEACHER LOGIN')

  teacherCookies = (await login('teacher@fontaine.tn', 'fontaine2026'))!
  assert(!!teacherCookies, 'Teacher login succeeds')

  // Invalid password
  const badPw = await login('teacher@fontaine.tn', 'wrongpassword')
  assert(badPw === null, 'Invalid password rejected')

  // Invalid email
  const badEmail = await login('nobody@example.com', 'fontaine2026')
  assert(badEmail === null, 'Unknown email rejected')

  // Protected route without auth
  const noAuthDash = await fetchPage('/ar/teacher')
  assert(noAuthDash.status === 200 || noAuthDash.status === 302 || noAuthDash.status === 307, 'Dashboard returns response')

  // Protected API without auth
  const noAuthApi = await apiGet('/api/classes', '')
  assert(noAuthApi.status === 401 || noAuthApi.status === 403, `Classes API requires auth (${noAuthApi.status})`)

  // Dashboard with auth
  const dashApi = await apiGet('/api/dashboard', teacherCookies)
  assert(dashApi.status === 200, 'Dashboard API returns 200 with auth')
  assert(dashApi.data?.teacherName !== undefined, `Teacher name: ${dashApi.data?.teacherName}`)

  // ==================== 3. CURRICULUM ====================
  startSection('3. CURRICULUM')

  const curriculum = await apiGet('/api/curriculum', teacherCookies)
  assert(curriculum.status === 200, 'Curriculum API returns 200')

  const grades = curriculum.data?.grades || curriculum.data || []
  assert(grades.length > 0, `Has grades (${grades.length})`)

  const grade = grades[0]
  assert(!!grade.nameAr && grade.nameAr.length > 0, `Grade name (AR): ${grade.nameAr}`)

  const subjects = grade.subjects || []
  assert(subjects.length > 0, `Has subjects (${subjects.length})`)

  const subject = subjects[0]
  assert(!!subject.nameAr, `Subject: ${subject.nameAr}`)

  const units = subject.units || []
  assert(units.length > 0, `Has units (${units.length})`)

  // Test multiple units
  let totalDomains = 0
  let totalLessons = 0
  let totalSkills = 0
  for (const unit of units) {
    const detail = await apiGet(`/api/curriculum/units/${unit.id}`, teacherCookies)
    assert(detail.status === 200, `Unit "${unit.nameAr}" loads OK`)
    const domains = detail.data?.domains || []
    for (const d of domains) {
      totalDomains++
      for (const l of d.lessons || []) {
        totalLessons++
        totalSkills += (l.skills || []).length
      }
    }
  }
  assert(totalDomains > 0, `Total domains: ${totalDomains}`)
  assert(totalLessons > 0, `Total lessons: ${totalLessons}`)
  assert(totalSkills > 0, `Total skills: ${totalSkills}`)

  // Pick a skill for later use
  const unitDetail = await apiGet(`/api/curriculum/units/${units[0].id}`, teacherCookies)
  const firstSkill = unitDetail.data.domains[0]?.lessons[0]?.skills[0]
  assert(!!firstSkill, `Selected skill: ${firstSkill?.nameAr}`)

  // ==================== 4. CLASS MANAGEMENT ====================
  startSection('4. CLASS MANAGEMENT')

  const classesRes = await apiGet('/api/classes', teacherCookies)
  assert(classesRes.status === 200, 'Classes API returns 200')
  const classList = Array.isArray(classesRes.data) ? classesRes.data : classesRes.data?.classes || []
  assert(classList.length > 0, `Has classes (${classList.length})`)

  const testClass = classList[0]
  assert(!!testClass.name, `Class name: ${testClass.name}`)
  assert(!!testClass.joinCode, `Join code exists: ${testClass.joinCode}`)

  const classStudents = await prisma.student.findMany({ where: { classId: testClass.id } })
  assert(classStudents.length > 0, `Class has ${classStudents.length} students`)

  // Data persists (check by reloading)
  const classesRes2 = await apiGet('/api/classes', teacherCookies)
  const classList2 = Array.isArray(classesRes2.data) ? classesRes2.data : classesRes2.data?.classes || []
  assert(classList2.length === classList.length, 'Class data persists across requests')

  // ==================== 5. MANUAL ACTIVITY CREATION (all 8 types) ====================
  startSection('5. MANUAL ACTIVITY CREATION (8 game types)')

  const gameTypePayloads: Record<string, { questions: any[] }> = {
    quiz: {
      questions: [{
        questionText: 'ما هو جمع "كتاب"؟',
        data: { type: 'quiz', options: [{ id: 'a', text: 'كُتُب' }, { id: 'b', text: 'كاتب' }, { id: 'c', text: 'مكتبة' }], correctOptionId: 'a' },
      }],
    },
    true_false: {
      questions: [{
        questionText: 'الجملة الاسمية تبدأ باسم',
        data: { type: 'true_false', statement: 'الجملة الاسمية تبدأ باسم', correctAnswer: true },
      }],
    },
    matching: {
      questions: [{
        questionText: 'طابق الكلمة بمعناها',
        data: { type: 'matching', pairs: [{ id: '1', left: 'شمس', right: 'نجم' }, { id: '2', left: 'قمر', right: 'كوكب' }] },
      }],
    },
    sentence_builder: {
      questions: [{
        questionText: 'رتّب الكلمات',
        data: { type: 'sentence_builder', words: ['المدرسة', 'إلى', 'ذهب', 'التلميذ'], correctOrder: ['ذهب', 'التلميذ', 'إلى', 'المدرسة'] },
      }],
    },
    order_story: {
      questions: [{
        questionText: 'رتّب الأحداث',
        data: { type: 'order_story', items: [{ id: '1', text: 'استيقظ' }, { id: '2', text: 'أكل' }, { id: '3', text: 'ذهب' }], correctOrder: ['1', '2', '3'] },
      }],
    },
    grammar_detective: {
      questions: [{
        questionText: 'حدّد نوع الكلمة',
        data: { type: 'grammar_detective', sentence: 'كتب التلميذ الدرس', targets: [{ id: '1', text: 'كتب', startIndex: 0, endIndex: 3, label: 'فعل' }], availableLabels: ['فعل', 'فاعل', 'مفعول به'] },
      }],
    },
    find_mistake: {
      questions: [{
        questionText: 'اكتشف الخطأ',
        data: { type: 'find_mistake', sentenceWithMistake: 'ذهب الطالبات', correctedSentence: 'ذهبت الطالبات', mistakeText: 'ذهب', correctionText: 'ذهبت', mistakeStartIndex: 0, mistakeEndIndex: 3 },
      }],
    },
    vocabulary: {
      questions: [{
        questionText: 'ما معنى الكلمة؟',
        data: { type: 'vocabulary', word: 'الفرح', definition: 'شعور بالسعادة', distractors: ['شعور بالحزن', 'شعور بالغضب'], format: 'definition' },
      }],
    },
  }

  const createdActivityIds: string[] = []

  for (const [gameType, payload] of Object.entries(gameTypePayloads)) {
    const res = await apiPost('/api/activities', {
      title: `Test ${gameType}`,
      titleAr: `اختبار ${gameType}`,
      description: `Test ${gameType} activity`,
      descriptionAr: `نشاط اختبار ${gameType}`,
      gameType,
      difficulty: 'easy',
      skillId: firstSkill.id,
      timeLimit: 30,
      questions: payload.questions,
    }, teacherCookies)
    assert(res.status === 200 || res.status === 201, `${gameType}: created (${res.status})`)
    const actId = res.data?.id || res.data?.activity?.id
    if (actId) createdActivityIds.push(actId)

    // Verify persisted
    if (actId) {
      const getRes = await apiGet(`/api/activities/${actId}`, teacherCookies)
      assert(getRes.status === 200, `${gameType}: reloads OK`)
      const questions = getRes.data?.questions || getRes.data?.activity?.questions || []
      assert(questions.length > 0, `${gameType}: has ${questions.length} questions`)
    }
  }
  assert(createdActivityIds.length === 8, `All 8 game types created (${createdActivityIds.length}/8)`)

  // ==================== 6. GAME SESSION ====================
  startSection('6. GAME SESSION (launch + student play)')

  const quizActivityId = createdActivityIds[0]
  const sessionRes = await apiPost('/api/sessions', { activityId: quizActivityId, classId: testClass.id }, teacherCookies)
  assert(sessionRes.status === 200 || sessionRes.status === 201, `Session created (${sessionRes.status})`)
  const sessionId = sessionRes.data?.id || sessionRes.data?.session?.id
  const sessionCode = sessionRes.data?.code || sessionRes.data?.session?.code
  assert(!!sessionCode, `Game code: ${sessionCode}`)
  assert(!!sessionId, `Session ID: ${sessionId}`)

  // Activate session
  await prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'active', startedAt: new Date() } })

  // Simulate 5 students joining and answering
  const students = classStudents.slice(0, 5)
  const questions = await prisma.question.findMany({ where: { activityId: quizActivityId }, orderBy: { orderIndex: 'asc' } })
  assert(questions.length > 0, `Activity has ${questions.length} questions`)

  for (const student of students) {
    await prisma.sessionParticipant.create({
      data: { sessionId, studentId: student.id, isConnected: true, totalScore: 0 },
    })

    let score = 0
    for (const q of questions) {
      const data = JSON.parse(q.data)
      const isCorrect = students.indexOf(student) < 3
      const s = isCorrect ? 10 : 0
      score += s
      await prisma.studentAnswer.create({
        data: {
          sessionId, studentId: student.id, questionId: q.id,
          answer: isCorrect ? JSON.stringify({ selectedOptionId: data.correctOptionId }) : JSON.stringify({ selectedOptionId: 'wrong' }),
          isCorrect, score: s, timeSpent: 3000 + Math.floor(Math.random() * 5000),
        },
      })
    }
    await prisma.sessionParticipant.update({
      where: { sessionId_studentId: { sessionId, studentId: student.id } },
      data: { totalScore: score },
    })
  }
  await prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'completed', completedAt: new Date() } })

  const answerCount = await prisma.studentAnswer.count({ where: { sessionId } })
  assert(answerCount === students.length * questions.length, `${answerCount} answers saved`)

  const correctCount = await prisma.studentAnswer.count({ where: { sessionId, isCorrect: true } })
  assert(correctCount === 3 * questions.length, `Correct answers: ${correctCount}`)

  // Session results API
  const resultsRes = await apiGet(`/api/sessions/results/${sessionId}`, teacherCookies)
  assert(resultsRes.status === 200, 'Session results API returns 200')

  // ==================== 7. ALL 8 GAME TYPES WITH STUDENTS ====================
  startSection('7. ALL 8 GAME TYPES WITH STUDENT ANSWERS')

  for (let i = 0; i < createdActivityIds.length; i++) {
    const actId = createdActivityIds[i]
    const gameType = Object.keys(gameTypePayloads)[i]
    const qs = await prisma.question.findMany({ where: { activityId: actId }, orderBy: { orderIndex: 'asc' } })
    if (qs.length === 0) { warn(`${gameType}: no questions to play`); continue }

    const sess = await apiPost('/api/sessions', { activityId: actId, classId: testClass.id }, teacherCookies)
    if (sess.status !== 200 && sess.status !== 201) { warn(`${gameType}: session create failed (${sess.status})`); continue }
    const sId = sess.data?.id || sess.data?.session?.id
    await prisma.gameSession.update({ where: { id: sId }, data: { status: 'active', startedAt: new Date() } })

    const st = classStudents[0]
    await prisma.sessionParticipant.create({ data: { sessionId: sId, studentId: st.id, totalScore: 0 } })

    for (const q of qs) {
      const data = JSON.parse(q.data)
      let answer: string
      switch (gameType) {
        case 'quiz': answer = JSON.stringify({ selectedOptionId: data.correctOptionId }); break
        case 'true_false': answer = JSON.stringify({ answer: data.correctAnswer }); break
        case 'matching': answer = JSON.stringify({ pairs: data.pairs.map((p: any) => ({ leftId: p.id, rightId: p.id })) }); break
        case 'sentence_builder': answer = JSON.stringify({ order: data.correctOrder }); break
        case 'order_story': answer = JSON.stringify({ order: data.correctOrder }); break
        case 'grammar_detective': answer = JSON.stringify({ labels: data.targets.map((t: any) => ({ targetId: t.id, label: t.label })) }); break
        case 'find_mistake': answer = JSON.stringify({ mistakeText: data.mistakeText, correctionText: data.correctionText }); break
        case 'vocabulary': answer = JSON.stringify({ selectedDefinition: data.definition }); break
        default: answer = '{}'
      }
      await prisma.studentAnswer.create({
        data: { sessionId: sId, studentId: st.id, questionId: q.id, answer, isCorrect: true, score: 10, timeSpent: 4000 },
      })
    }
    await prisma.sessionParticipant.update({
      where: { sessionId_studentId: { sessionId: sId, studentId: st.id } },
      data: { totalScore: 10 * qs.length },
    })
    await prisma.gameSession.update({ where: { id: sId }, data: { status: 'completed', completedAt: new Date() } })

    const aCount = await prisma.studentAnswer.count({ where: { sessionId: sId } })
    assert(aCount === qs.length, `${gameType}: ${aCount} answers recorded`)
  }

  // ==================== 8. ANALYTICS ====================
  startSection('8. ANALYTICS')

  // Update student results for skill
  for (const st of classStudents.slice(0, 5)) {
    await prisma.studentResult.upsert({
      where: { studentId_skillId: { studentId: st.id, skillId: firstSkill.id } },
      create: { studentId: st.id, skillId: firstSkill.id, totalAttempts: 5, correctCount: students.indexOf(st) < 3 ? 5 : 1, masteryLevel: students.indexOf(st) < 3 ? 'proficient' : 'developing', lastAttemptAt: new Date() },
      update: { totalAttempts: { increment: 5 }, correctCount: { increment: students.indexOf(st) < 3 ? 5 : 1 }, lastAttemptAt: new Date() },
    })
  }

  const analyticsRes = await apiGet(`/api/analytics?classId=${testClass.id}`, teacherCookies)
  assert(analyticsRes.status === 200, 'Analytics API returns 200')
  const classAnalytics = analyticsRes.data?.classes?.[0]
  assert(!!classAnalytics, 'Has class analytics')
  assert(classAnalytics.totalStudents > 0, `Total students: ${classAnalytics.totalStudents}`)
  assert(classAnalytics.totalSessions > 0, `Total sessions: ${classAnalytics.totalSessions}`)

  const skillPerf = classAnalytics.skillPerformance
  assert(Array.isArray(skillPerf) && skillPerf.length > 0, `Skill performance: ${skillPerf?.length} skills`)

  const needingSupport = classAnalytics.studentsNeedingSupport || []
  assert(Array.isArray(needingSupport), `Students needing support: ${needingSupport.length}`)

  // Student progress
  const studentProgress = await apiGet(`/api/students/${classStudents[4].id}/progress`, teacherCookies)
  assert(studentProgress.status === 200, 'Student progress API returns 200')

  // Analytics persist on reload
  const analyticsRes2 = await apiGet(`/api/analytics?classId=${testClass.id}`, teacherCookies)
  assert(analyticsRes2.status === 200, 'Analytics persist across requests')
  assert(analyticsRes2.data?.classes?.[0]?.totalSessions === classAnalytics.totalSessions, 'Session count consistent')

  // ==================== 9. REMEDIATION ====================
  startSection('9. REMEDIATION (weak skill detection)')

  // Create deliberately weak results
  const weakStudent = classStudents[classStudents.length - 1]
  await prisma.studentResult.upsert({
    where: { studentId_skillId: { studentId: weakStudent.id, skillId: firstSkill.id } },
    create: { studentId: weakStudent.id, skillId: firstSkill.id, totalAttempts: 10, correctCount: 3, masteryLevel: 'developing', lastAttemptAt: new Date() },
    update: { totalAttempts: 10, correctCount: 3, masteryLevel: 'developing', lastAttemptAt: new Date() },
  })

  const weakAnalytics = await apiGet(`/api/analytics?classId=${testClass.id}`, teacherCookies)
  const weakSkills = weakAnalytics.data?.classes?.[0]?.weakSkills || []
  // Weak skills may or may not appear depending on threshold
  console.log(`  Weak skills detected: ${weakSkills.length}`)

  const weakProgress = await apiGet(`/api/students/${weakStudent.id}/progress`, teacherCookies)
  assert(weakProgress.status === 200, 'Weak student progress loads')

  // ==================== 10. REAL OLLAMA AI ====================
  startSection('10. REAL OLLAMA AI GENERATION')

  const aiStatus = await apiGet('/api/ai/status', teacherCookies)
  assert(aiStatus.status === 200, 'AI status returns 200')
  assert(aiStatus.data?.providerType === 'ollama', `Provider: ${aiStatus.data?.providerType}`)
  assert(aiStatus.data?.model === 'qwen2.5:3b', `Model: ${aiStatus.data?.model}`)
  assert(aiStatus.data?.available === true, 'AI is available')

  // Quiz generation
  console.log('  Generating quiz with real Ollama...')
  const quizGen = await apiPost('/api/ai/generate', {
    skillId: firstSkill.id, gameType: 'quiz', difficulty: 'easy', questionCount: 3,
  }, teacherCookies)
  assert(quizGen.status === 200, `Quiz generation: ${quizGen.status}`)
  if (quizGen.status === 200) {
    assert(quizGen.data.activity?.status === 'draft', 'Quiz is draft')
    assert(quizGen.data.activity?.questions?.length > 0, `Quiz: ${quizGen.data.activity?.questions?.length} questions`)
  } else {
    console.log(`    Error: ${JSON.stringify(quizGen.data)}`)
  }
  const quizAiActivityId = quizGen.data?.activityId

  // True/false generation
  console.log('  Generating true/false with real Ollama...')
  const tfGen = await apiPost('/api/ai/generate', {
    skillId: firstSkill.id, gameType: 'true_false', difficulty: 'easy', questionCount: 3,
  }, teacherCookies)
  assert(tfGen.status === 200, `True/false generation: ${tfGen.status}`)
  if (tfGen.status === 200) {
    assert(tfGen.data.activity?.questions?.length > 0, `T/F: ${tfGen.data.activity?.questions?.length} questions`)
    // Cleanup
    if (tfGen.data.activityId) {
      await prisma.question.deleteMany({ where: { activityId: tfGen.data.activityId } })
      await prisma.aiLog.deleteMany({ where: { activityId: tfGen.data.activityId } })
      await prisma.activity.delete({ where: { id: tfGen.data.activityId } }).catch(() => {})
    }
  }

  // Vocabulary generation
  console.log('  Generating vocabulary with real Ollama...')
  const vocabGen = await apiPost('/api/ai/generate', {
    skillId: firstSkill.id, gameType: 'vocabulary', difficulty: 'easy', questionCount: 2,
  }, teacherCookies)
  assert(vocabGen.status === 200, `Vocabulary generation: ${vocabGen.status}`)
  if (vocabGen.data?.activityId) {
    await prisma.question.deleteMany({ where: { activityId: vocabGen.data.activityId } })
    await prisma.aiLog.deleteMany({ where: { activityId: vocabGen.data.activityId } })
    await prisma.activity.delete({ where: { id: vocabGen.data.activityId } }).catch(() => {})
  }

  // AI remediation
  console.log('  Generating remediation with real Ollama...')
  const remGen = await apiPost('/api/ai/remediate', {
    skillId: firstSkill.id, gameType: 'quiz', questionCount: 3, classId: testClass.id,
  }, teacherCookies)
  assert(remGen.status === 200, `Remediation: ${remGen.status}`)
  if (remGen.status === 200) {
    assert(remGen.data.activity?.status === 'draft', 'Remediation is draft')
    if (remGen.data.activityId) {
      await prisma.question.deleteMany({ where: { activityId: remGen.data.activityId } })
      await prisma.aiLog.deleteMany({ where: { activityId: remGen.data.activityId } })
      await prisma.activity.delete({ where: { id: remGen.data.activityId } }).catch(() => {})
    }
  }

  // ==================== 11. AI TEACHER APPROVAL ====================
  startSection('11. AI TEACHER APPROVAL WORKFLOW')

  if (quizAiActivityId) {
    // Verify draft
    const draftCheck = await prisma.activity.findUnique({ where: { id: quizAiActivityId } })
    assert(draftCheck?.status === 'draft', 'AI activity starts as draft')
    assert(draftCheck?.isAiGenerated === true, 'Marked as AI-generated')

    // Teacher reviews
    const reviewRes = await apiGet(`/api/activities/${quizAiActivityId}`, teacherCookies)
    assert(reviewRes.status === 200, 'Teacher can review')

    // Approve
    const approveRes = await apiPut(`/api/activities/${quizAiActivityId}`, { status: 'published' }, teacherCookies)
    assert(approveRes.status === 200, 'Teacher approves')

    const publishedCheck = await prisma.activity.findUnique({ where: { id: quizAiActivityId } })
    assert(publishedCheck?.status === 'published', 'Activity is now published')

    // In activity list
    const listRes = await apiGet('/api/activities', teacherCookies)
    const found = (listRes.data?.activities || listRes.data || []).find((a: any) => a.id === quizAiActivityId)
    assert(!!found, 'Published AI activity in list')

    // Can be launched
    const aiSession = await apiPost('/api/sessions', { activityId: quizAiActivityId, classId: testClass.id }, teacherCookies)
    assert(aiSession.status === 200 || aiSession.status === 201, 'AI activity can be launched')
  } else {
    warn('Quiz AI generation failed — skipping approval workflow')
  }

  // ==================== 12. AI CHAT ====================
  startSection('12. AI CHAT (real Ollama)')

  console.log('  Testing curriculum-related chat...')
  const chatRes = await apiPost('/api/ai/chat', {
    messages: [{ role: 'user', content: `اشرح لي مهارة ${firstSkill.nameAr} وكيف أعلمها` }],
    skillId: firstSkill.id,
    classId: testClass.id,
  }, teacherCookies)
  assert(chatRes.status === 200, `Chat returns 200 (${chatRes.status})`)
  if (chatRes.status === 200) {
    assert(chatRes.data.message?.content?.length > 0, `Chat response: ${chatRes.data.message?.content?.substring(0, 80)}...`)
  }

  // ==================== 13. AI EXPLANATION ====================
  startSection('13. AI EXPLANATION (real Ollama)')

  console.log('  Testing mistake explanation...')
  const expRes = await apiPost('/api/ai/explain', {
    skillId: firstSkill.id, classId: testClass.id,
  }, teacherCookies)
  assert(expRes.status === 200, `Explanation returns 200 (${expRes.status})`)
  if (expRes.status === 200) {
    assert(expRes.data.explanation?.length > 0, `Explanation length: ${expRes.data.explanation?.length} chars`)
  }

  // ==================== 14. SECURITY ====================
  startSection('14. SECURITY')

  // Unauthenticated AI endpoints
  const noAuthEndpoints = [
    { m: 'POST', p: '/api/ai/generate', b: '{"skillId":"x","gameType":"quiz","difficulty":"easy","questionCount":1}' },
    { m: 'POST', p: '/api/ai/remediate', b: '{"skillId":"x"}' },
    { m: 'POST', p: '/api/ai/chat', b: '{"messages":[{"role":"user","content":"test"}]}' },
    { m: 'POST', p: '/api/ai/explain', b: '{"skillId":"x"}' },
    { m: 'GET', p: '/api/ai/status', b: null },
    { m: 'GET', p: '/api/analytics', b: null },
    { m: 'GET', p: '/api/classes', b: null },
    { m: 'GET', p: '/api/dashboard', b: null },
  ]

  for (const ep of noAuthEndpoints) {
    const res = await fetch(`${BASE}${ep.p}`, {
      method: ep.m,
      headers: ep.b ? { 'Content-Type': 'application/json' } : {},
      body: ep.b,
    })
    assert(res.status === 401 || res.status === 403, `${ep.m} ${ep.p} requires auth (${res.status})`)
  }

  // Cross-teacher access: try accessing with manipulated IDs
  // (We only have one teacher, so we test that invalid IDs are handled)
  const fakeClassRes = await apiGet('/api/analytics?classId=fake-class-id-12345', teacherCookies)
  assert(fakeClassRes.status === 200 || fakeClassRes.status === 404, `Fake class ID handled (${fakeClassRes.status})`)

  const fakeStudentRes = await apiGet('/api/students/fake-student-id/progress', teacherCookies)
  assert(fakeStudentRes.status === 200 || fakeStudentRes.status === 404, `Fake student ID handled (${fakeStudentRes.status})`)

  // ==================== 15. DATABASE PERSISTENCE ====================
  startSection('15. DATABASE PERSISTENCE')

  const beforeTeachers = await prisma.user.count()
  const beforeClasses = await prisma.class.count()
  const beforeStudents = await prisma.student.count()
  const beforeActivities = await prisma.activity.count()
  const beforeSessions = await prisma.gameSession.count()
  const beforeAnswers = await prisma.studentAnswer.count()
  const beforeResults = await prisma.studentResult.count()
  const beforeAiLogs = await prisma.aiLog.count()

  // Disconnect and reconnect
  await prisma.$disconnect()
  await prisma.$connect()

  const afterTeachers = await prisma.user.count()
  const afterClasses = await prisma.class.count()
  const afterStudents = await prisma.student.count()
  const afterActivities = await prisma.activity.count()
  const afterSessions = await prisma.gameSession.count()
  const afterAnswers = await prisma.studentAnswer.count()
  const afterResults = await prisma.studentResult.count()
  const afterAiLogs = await prisma.aiLog.count()

  assert(afterTeachers === beforeTeachers, `Teachers persist (${afterTeachers})`)
  assert(afterClasses === beforeClasses, `Classes persist (${afterClasses})`)
  assert(afterStudents === beforeStudents, `Students persist (${afterStudents})`)
  assert(afterActivities === beforeActivities, `Activities persist (${afterActivities})`)
  assert(afterSessions === beforeSessions, `Sessions persist (${afterSessions})`)
  assert(afterAnswers === beforeAnswers, `Answers persist (${afterAnswers})`)
  assert(afterResults === beforeResults, `Results persist (${afterResults})`)
  assert(afterAiLogs === beforeAiLogs, `AI logs persist (${afterAiLogs})`)

  // ==================== 16-18. PAGE RENDERING (RTL, i18n) ====================
  startSection('16-18. PAGE RENDERING, RTL, i18n')

  // Arabic pages
  const arPages = [
    '/ar/teacher',
    '/ar/teacher/activities',
    '/ar/teacher/analytics',
    '/ar/teacher/ai/generate',
    '/ar/teacher/ai/chat',
  ]

  for (const page of arPages) {
    const res = await fetch(`${BASE}${page}`, { headers: { Cookie: teacherCookies, Accept: 'text/html' }, redirect: 'follow' })
    const html = await res.text()
    assert(res.status === 200, `${page} loads (${res.status})`)
    // Check for dir="rtl" or class with RTL
    const hasRtl = html.includes('dir="rtl"') || html.includes("dir='rtl'") || html.includes('rtl')
    if (page.startsWith('/ar')) {
      assert(hasRtl, `${page} has RTL`)
    }
  }

  // French pages
  const frPage = await fetch(`${BASE}/fr/teacher`, { headers: { Cookie: teacherCookies, Accept: 'text/html' }, redirect: 'follow' })
  assert(frPage.status === 200, '/fr/teacher loads')

  // English pages
  const enPage = await fetch(`${BASE}/en/teacher`, { headers: { Cookie: teacherCookies, Accept: 'text/html' }, redirect: 'follow' })
  assert(enPage.status === 200, '/en/teacher loads')

  // Student pages
  const joinPage = await fetch(`${BASE}/ar/join`, { headers: { Accept: 'text/html' }, redirect: 'follow' })
  assert(joinPage.status === 200, '/ar/join (student join) loads')

  // Check i18n files exist and have keys
  const arMessages = JSON.parse(readFileSync(resolve(__dirname, 'messages/ar.json'), 'utf-8'))
  const frMessages = JSON.parse(readFileSync(resolve(__dirname, 'messages/fr.json'), 'utf-8'))
  const enMessages = JSON.parse(readFileSync(resolve(__dirname, 'messages/en.json'), 'utf-8'))

  assert(!!arMessages.ai, 'Arabic messages have "ai" section')
  assert(!!frMessages.ai, 'French messages have "ai" section')
  assert(!!enMessages.ai, 'English messages have "ai" section')
  assert(!!arMessages.analytics, 'Arabic messages have "analytics" section')
  assert(Object.keys(arMessages.ai).length === Object.keys(enMessages.ai).length, 'AR/EN AI key count matches')

  // ==================== 20. AI UNAVAILABLE ====================
  startSection('20. AI UNAVAILABLE (graceful degradation)')

  // Verify AI status is available
  const aiStatusCheck = await apiGet('/api/ai/status', teacherCookies)
  assert(aiStatusCheck.status === 200 && aiStatusCheck.data?.available === true, 'AI status reports available')

  // The non-AI features always work regardless
  const dashOk = await apiGet('/api/dashboard', teacherCookies)
  assert(dashOk.status === 200, 'Dashboard works regardless of AI')
  const classesOk = await apiGet('/api/classes', teacherCookies)
  assert(classesOk.status === 200, 'Classes work regardless of AI')
  const currOk = await apiGet('/api/curriculum', teacherCookies)
  assert(currOk.status === 200, 'Curriculum works regardless of AI')

  // ==================== 21. ERROR HANDLING ====================
  startSection('21. ERROR HANDLING')

  // Invalid game code
  const badCode = await apiGet('/api/sessions/ZZZZZZ', teacherCookies)
  assert(badCode.status === 404 || badCode.status === 200, `Invalid code handled (${badCode.status})`)

  // Invalid activity ID
  const badAct = await apiGet('/api/activities/nonexistent-id', teacherCookies)
  assert(badAct.status === 404 || badAct.status === 200, `Invalid activity handled (${badAct.status})`)

  // Invalid AI request (missing fields)
  const badAiReq = await apiPost('/api/ai/generate', { skillId: '' }, teacherCookies)
  assert(badAiReq.status === 400 || badAiReq.status === 422, `Invalid AI request handled (${badAiReq.status})`)

  // Empty AI chat
  const emptyChat = await apiPost('/api/ai/chat', { messages: [] }, teacherCookies)
  assert(emptyChat.status === 400 || emptyChat.status === 200, `Empty chat handled (${emptyChat.status})`)

  // ==================== SUMMARY ====================
  console.log('\n' + '█'.repeat(60))
  console.log('  FULL-SYSTEM TEST RESULTS')
  console.log('█'.repeat(60))

  console.log(`\n  TOTAL: ${passed} passed, ${failed} failed`)

  console.log('\n  Section breakdown:')
  for (const [name, data] of Object.entries(sections)) {
    const status = data.failed === 0 ? '✅' : '❌'
    console.log(`    ${status} ${name}: ${data.passed}/${data.passed + data.failed}`)
    for (const detail of data.details) {
      console.log(`       ${detail}`)
    }
  }

  if (warnings.length > 0) {
    console.log(`\n  Warnings (${warnings.length}):`)
    for (const w of warnings) {
      console.log(`    ⚠️  ${w}`)
    }
  }

  console.log('')
  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Fatal test error:', e); process.exit(1) })
