import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = 'http://localhost:3000'

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${msg}`)
    failed++
  }
}

async function login(email: string, password: string): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const cookies = csrfRes.headers.getSetCookie?.() || []
  const csrfCookie = cookies.find((c: string) => c.startsWith('authjs.csrf-token') || c.startsWith('next-auth.csrf-token'))

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookie || '',
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      json: 'true',
    }),
    redirect: 'manual',
  })

  const allCookies = loginRes.headers.getSetCookie?.() || []
  const sessionCookie = allCookies.find((c: string) => c.startsWith('authjs.session-token') || c.startsWith('next-auth.session-token'))

  if (!sessionCookie) {
    throw new Error('Login failed - no session cookie')
  }

  return [csrfCookie, sessionCookie].filter(Boolean).join('; ')
}

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Expected JSON from ${res.url} (${res.status}) but got: ${text.substring(0, 120)}`)
  }
}

async function apiGet(path: string, cookies: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookies } })
  return { status: res.status, data: await safeJson(res) }
}

async function apiPost(path: string, body: unknown, cookies: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await safeJson(res) }
}

async function apiPut(path: string, body: unknown, cookies: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await safeJson(res) }
}

async function main() {
  console.log('\n========================================')
  console.log('  FONTAINE E2E EDUCATIONAL LOOP TEST')
  console.log('========================================\n')

  // STEP 1: Teacher Login
  console.log('STEP 1: Teacher Login')
  let cookies: string
  try {
    cookies = await login('teacher@fontaine.tn', 'fontaine2026')
    assert(!!cookies, 'Teacher logged in successfully')
  } catch (e: any) {
    console.log(`  ❌ Login failed: ${e.message}`)
    process.exit(1)
  }

  // STEP 2: Browse Curriculum
  console.log('\nSTEP 2: Browse Curriculum -> Choose Unit/Lesson/Skill')
  const curriculum = await apiGet('/api/curriculum', cookies)
  assert(curriculum.status === 200, `Curriculum API returns 200 (got ${curriculum.status})`)

  const grades = curriculum.data.grades || curriculum.data || []
  assert(grades.length > 0, `Has grades (${grades.length})`)

  const grade = grades[0]
  const subject = grade.subjects?.[0]
  assert(!!subject, `Has subject: ${subject?.nameAr}`)

  const unit = subject?.units?.[0]
  assert(!!unit, `Has unit: ${unit?.nameAr}`)

  const unitDetail = await apiGet(`/api/curriculum/units/${unit.id}`, cookies)
  assert(unitDetail.status === 200, 'Unit detail API returns 200')

  const domain = unitDetail.data.domains?.[0]
  assert(!!domain, `Has domain: ${domain?.nameAr}`)

  const lesson = domain?.lessons?.[0]
  assert(!!lesson, `Has lesson: ${lesson?.nameAr}`)

  const skill = lesson?.skills?.[0]
  assert(!!skill, `Has skill: ${skill?.nameAr} (id: ${skill?.id})`)

  // STEP 3: Create Activity Manually
  console.log('\nSTEP 3: Create Activity Manually')
  const activityPayload = {
    title: 'E2E Test Quiz',
    titleAr: 'اختبار شامل للتجربة',
    description: 'E2E test activity',
    descriptionAr: 'نشاط اختبار شامل',
    gameType: 'quiz',
    difficulty: 'easy',
    skillId: skill.id,
    timeLimit: 30,
    questions: [
      {
        questionText: 'ما هو جمع كلمة كتاب؟',
        data: {
          type: 'quiz',
          options: [
            { id: 'a', text: 'كتب' },
            { id: 'b', text: 'كاتب' },
            { id: 'c', text: 'مكتبة' },
            { id: 'd', text: 'كتابة' },
          ],
          correctOptionId: 'a',
        },
      },
      {
        questionText: 'أكمل: الطفل ___ إلى المدرسة',
        data: {
          type: 'quiz',
          options: [
            { id: 'a', text: 'ذهب' },
            { id: 'b', text: 'أكل' },
            { id: 'c', text: 'نام' },
          ],
          correctOptionId: 'a',
        },
      },
    ],
  }

  const createAct = await apiPost('/api/activities', activityPayload, cookies)
  assert(createAct.status === 200 || createAct.status === 201, `Activity created (status ${createAct.status})`)

  const activityId = createAct.data.id || createAct.data.activity?.id
  assert(!!activityId, `Activity has ID: ${activityId}`)

  // STEP 4: Launch Game Session
  console.log('\nSTEP 4: Launch Game Session')
  const classes = await apiGet('/api/classes', cookies)
  assert(classes.status === 200, 'Classes API returns 200')

  const classArr = Array.isArray(classes.data) ? classes.data : classes.data.classes || []
  const classData = classArr[0]
  assert(!!classData, `Has class: ${classData?.name}`)

  const createSession = await apiPost('/api/sessions', { activityId, classId: classData.id }, cookies)
  assert(createSession.status === 200 || createSession.status === 201, `Session created (status ${createSession.status})`)

  const sessionId = createSession.data.id || createSession.data.session?.id
  const sessionCode = createSession.data.code || createSession.data.session?.code
  assert(!!sessionCode, `Session code: ${sessionCode}`)
  assert(!!sessionId, `Session ID: ${sessionId}`)

  // STEP 5: Students Play (simulate via DB)
  console.log('\nSTEP 5: Students Play')
  const students = await prisma.student.findMany({ where: { classId: classData.id }, take: 5 })
  assert(students.length >= 5, `Found ${students.length} students`)

  const questions = await prisma.question.findMany({ where: { activityId }, orderBy: { orderIndex: 'asc' } })
  assert(questions.length === 2, `Activity has ${questions.length} questions`)

  await prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'active', startedAt: new Date() } })

  for (const student of students) {
    await prisma.sessionParticipant.create({
      data: { sessionId, studentId: student.id, isConnected: true, totalScore: 0 },
    })

    let totalScore = 0
    for (const q of questions) {
      const data = JSON.parse(q.data)
      const isCorrect = students.indexOf(student) < 2
      const score = isCorrect ? 10 : 0
      totalScore += score

      await prisma.studentAnswer.create({
        data: {
          sessionId,
          studentId: student.id,
          questionId: q.id,
          answer: isCorrect
            ? JSON.stringify({ selectedOptionId: data.correctOptionId })
            : JSON.stringify({ selectedOptionId: 'b' }),
          isCorrect,
          score,
          timeSpent: 5000 + Math.floor(Math.random() * 10000),
        },
      })
    }

    await prisma.sessionParticipant.update({
      where: { sessionId_studentId: { sessionId, studentId: student.id } },
      data: { totalScore },
    })
  }

  await prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'completed', completedAt: new Date() } })

  // STEP 6: Verify Answers Saved
  console.log('\nSTEP 6: Verify Answers Saved')
  const answers = await prisma.studentAnswer.findMany({ where: { sessionId } })
  assert(answers.length === students.length * questions.length, `${answers.length} answers saved (expected ${students.length * questions.length})`)
  assert(answers.filter(a => a.isCorrect).length === 4, `4 correct answers (2 students x 2 questions)`)
  assert(answers.filter(a => !a.isCorrect).length === 6, `6 wrong answers (3 students x 2 questions)`)

  // Update student skill results
  for (const student of students) {
    const sa = answers.filter(a => a.studentId === student.id)
    const correct = sa.filter(a => a.isCorrect).length
    const total = sa.length
    const ratio = total > 0 ? correct / total : 0
    const mastery = ratio >= 0.8 ? 'proficient' : ratio >= 0.5 ? 'developing' : 'not_started'

    await prisma.studentResult.upsert({
      where: { studentId_skillId: { studentId: student.id, skillId: skill.id } },
      create: { studentId: student.id, skillId: skill.id, totalAttempts: total, correctCount: correct, masteryLevel: mastery, lastAttemptAt: new Date() },
      update: { totalAttempts: { increment: total }, correctCount: { increment: correct }, masteryLevel: mastery, lastAttemptAt: new Date() },
    })
  }

  // STEP 7: Analytics
  console.log('\nSTEP 7: Analytics')
  const analytics = await apiGet(`/api/analytics?classId=${classData.id}`, cookies)
  assert(analytics.status === 200, 'Analytics API returns 200')

  const classAnalytics = analytics.data.classes?.[0]
  assert(!!classAnalytics, 'Has class analytics data')
  assert(classAnalytics.totalStudents > 0, `Total students: ${classAnalytics.totalStudents}`)
  assert(classAnalytics.totalSessions > 0, `Total sessions: ${classAnalytics.totalSessions}`)

  const skillPerf = classAnalytics.skillPerformance
  assert(Array.isArray(skillPerf), 'Has skillPerformance array')
  if (skillPerf?.length > 0) {
    assert(skillPerf[0].accuracy !== undefined, `Skill accuracy: ${skillPerf[0].accuracy}%`)
    assert(!!skillPerf[0].skillNameAr, `Skill name: ${skillPerf[0].skillNameAr}`)
  }

  // STEP 8: Weak Skill Detection
  console.log('\nSTEP 8: Weak Skill Detection')
  const needSupport = classAnalytics.studentsNeedingSupport || []
  assert(needSupport.length > 0, `${needSupport.length} students needing support`)

  const studentProgress = await apiGet(`/api/students/${students[2].id}/progress`, cookies)
  assert(studentProgress.status === 200, 'Student progress API returns 200')
  const missed = studentProgress.data.frequentlyMissedQuestions || []
  console.log(`  Frequently missed questions: ${missed.length}`)

  // STEP 9: Create Practice with AI - Check AI Status
  console.log('\nSTEP 9: Create Practice with AI (check AI status)')
  const aiStatus = await apiGet('/api/ai/status', cookies)
  assert(aiStatus.status === 200, 'AI status API returns 200')
  assert(aiStatus.data.available === true, `AI available: ${aiStatus.data.available} (provider: ${aiStatus.data.provider})`)

  // STEP 10: Mock AI Generates Draft
  console.log('\nSTEP 10: Local/Mock AI Generates Draft')
  const aiGenerate = await apiPost('/api/ai/generate', {
    skillId: skill.id,
    gameType: 'quiz',
    difficulty: 'easy',
    questionCount: 3,
  }, cookies)
  assert(aiGenerate.status === 200, `AI generate returns 200 (got ${aiGenerate.status})`)

  if (aiGenerate.status !== 200) {
    console.log(`  Error detail: ${JSON.stringify(aiGenerate.data)}`)
  }

  const aiActivity = aiGenerate.data.activity
  const aiActivityId = aiGenerate.data.activityId
  assert(!!aiActivityId, `AI activity ID: ${aiActivityId}`)

  // STEP 11: Validation
  console.log('\nSTEP 11: Validation (draft status, question structure)')
  assert(aiActivity?.status === 'draft', `Activity status is DRAFT (got: ${aiActivity?.status})`)
  assert(aiActivity?.questions?.length > 0, `Has ${aiActivity?.questions?.length} validated questions`)

  for (const q of aiActivity?.questions || []) {
    const data = typeof q.data === 'string' ? JSON.parse(q.data) : q.data
    assert(data.type === 'quiz', 'Question type is quiz')
    assert(Array.isArray(data.options) && data.options.length >= 2, `Has ${data.options?.length} options`)
    assert(!!data.correctOptionId, 'Has correctOptionId')
  }

  const dbAct = await prisma.activity.findUnique({ where: { id: aiActivityId } })
  assert(dbAct?.isAiGenerated === true, 'Marked as AI-generated in DB')
  assert(dbAct?.status === 'draft', 'Status is draft in DB')

  const aiLogs = await prisma.aiLog.findMany({ where: { activityId: aiActivityId } })
  assert(aiLogs.length > 0, `AI log created (${aiLogs.length} entries)`)
  assert(aiLogs[0].type === 'generation', `Log type: ${aiLogs[0].type}`)
  assert(aiLogs[0].status === 'success', `Log status: ${aiLogs[0].status}`)

  // STEP 12: Teacher Reviews
  console.log('\nSTEP 12: Teacher Reviews')
  const detail = await apiGet(`/api/activities/${aiActivityId}`, cookies)
  assert(detail.status === 200, 'Can fetch AI activity for review')

  // STEP 13: Approve
  console.log('\nSTEP 13: Teacher Approves -> Published')
  const approveRes = await apiPut(`/api/activities/${aiActivityId}`, { status: 'published' }, cookies)
  assert(approveRes.status === 200, `Approve returns 200 (got ${approveRes.status})`)

  const updated = await prisma.activity.findUnique({ where: { id: aiActivityId } })
  assert(updated?.status === 'published', `Activity status now: ${updated?.status}`)

  // STEP 14: New Activity in List
  console.log('\nSTEP 14: New Activity Appears in List')
  const actList = await apiGet('/api/activities', cookies)
  assert(actList.status === 200, 'Activities list returns 200')

  const allActs = actList.data.activities || actList.data || []
  const found = allActs.find((a: any) => a.id === aiActivityId)
  assert(!!found, 'AI activity in list')
  assert(found?.status === 'published', 'Shows as published')
  assert(found?.isAiGenerated === true, 'Shows as AI-generated')

  // STEP 15: Students Play Again
  console.log('\nSTEP 15: Students Play the AI-Generated Activity')
  const session2 = await apiPost('/api/sessions', { activityId: aiActivityId, classId: classData.id }, cookies)
  assert(session2.status === 200 || session2.status === 201, `New session created (status ${session2.status})`)

  const session2Id = session2.data.id || session2.data.session?.id
  assert(!!session2Id, `Session 2 ID: ${session2Id}`)

  await prisma.gameSession.update({ where: { id: session2Id }, data: { status: 'active', startedAt: new Date() } })

  const aiQuestions = await prisma.question.findMany({ where: { activityId: aiActivityId }, orderBy: { orderIndex: 'asc' } })
  assert(aiQuestions.length > 0, `AI activity has ${aiQuestions.length} playable questions`)

  for (const student of students.slice(0, 3)) {
    await prisma.sessionParticipant.create({
      data: { sessionId: session2Id, studentId: student.id, totalScore: 0 },
    })

    let score = 0
    for (const q of aiQuestions) {
      const data = JSON.parse(q.data)
      const isCorrect = Math.random() > 0.3
      await prisma.studentAnswer.create({
        data: {
          sessionId: session2Id,
          studentId: student.id,
          questionId: q.id,
          answer: isCorrect
            ? JSON.stringify({ selectedOptionId: data.correctOptionId })
            : JSON.stringify({ selectedOptionId: data.options?.[1]?.id || 'b' }),
          isCorrect,
          score: isCorrect ? 10 : 0,
          timeSpent: 3000 + Math.floor(Math.random() * 8000),
        },
      })
      if (isCorrect) score += 10
    }

    await prisma.sessionParticipant.update({
      where: { sessionId_studentId: { sessionId: session2Id, studentId: student.id } },
      data: { totalScore: score },
    })
  }

  await prisma.gameSession.update({ where: { id: session2Id }, data: { status: 'completed', completedAt: new Date() } })

  const s2Answers = await prisma.studentAnswer.count({ where: { sessionId: session2Id } })
  assert(s2Answers > 0, `${s2Answers} answers saved from AI activity session`)

  const results = await apiGet(`/api/sessions/results/${session2Id}`, cookies)
  assert(results.status === 200, 'Session 2 results API returns 200')

  // BONUS: Test AI Remediation
  console.log('\nBONUS: AI Remediation Endpoint')
  const remRes = await apiPost('/api/ai/remediate', { skillId: skill.id, gameType: 'true_false', questionCount: 3, classId: classData.id }, cookies)
  assert(remRes.status === 200, `Remediation returns 200 (got ${remRes.status})`)
  assert(remRes.data.activity?.status === 'draft', 'Remediation is draft')
  if (remRes.data.activityId) {
    await prisma.question.deleteMany({ where: { activityId: remRes.data.activityId } })
    await prisma.aiLog.deleteMany({ where: { activityId: remRes.data.activityId } })
    await prisma.activity.delete({ where: { id: remRes.data.activityId } }).catch(() => {})
  }

  // BONUS: Test AI Chat
  console.log('\nBONUS: AI Teacher Chat')
  const chatRes = await apiPost('/api/ai/chat', {
    messages: [{ role: 'user', content: 'كيف أحسن أداء التلاميذ في القراءة؟' }],
    classId: classData.id,
  }, cookies)
  assert(chatRes.status === 200, `Chat returns 200 (got ${chatRes.status})`)
  assert(!!chatRes.data.message?.content, `Chat response: "${chatRes.data.message?.content?.substring(0, 50)}..."`)

  // BONUS: Test AI Explain
  console.log('\nBONUS: AI Mistake Explanation')
  const expRes = await apiPost('/api/ai/explain', { skillId: skill.id, classId: classData.id }, cookies)
  assert(expRes.status === 200, `Explain returns 200 (got ${expRes.status})`)
  assert(!!expRes.data.explanation, `Explanation: "${expRes.data.explanation?.substring(0, 50)}..."`)

  // BONUS: Security
  console.log('\nBONUS: Security (unauthenticated rejection)')
  const noAuth1 = await fetch(`${BASE}/api/ai/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"skillId":"x","gameType":"quiz","difficulty":"easy","questionCount":1}' })
  assert(noAuth1.status === 401, `Generate rejects unauth (${noAuth1.status})`)

  const noAuth2 = await fetch(`${BASE}/api/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"messages":[{"role":"user","content":"test"}]}' })
  assert(noAuth2.status === 401, `Chat rejects unauth (${noAuth2.status})`)

  const noAuth3 = await fetch(`${BASE}/api/ai/explain`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"skillId":"x"}' })
  assert(noAuth3.status === 401, `Explain rejects unauth (${noAuth3.status})`)

  const noAuth4 = await fetch(`${BASE}/api/ai/remediate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"skillId":"x"}' })
  assert(noAuth4.status === 401, `Remediate rejects unauth (${noAuth4.status})`)

  // SUMMARY
  console.log('\n========================================')
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
  console.log('========================================\n')

  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Test error:', e); process.exit(1) })
