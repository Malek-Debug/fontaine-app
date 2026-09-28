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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie || '' },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
    redirect: 'manual',
  })

  const allCookies = loginRes.headers.getSetCookie?.() || []
  const sessionCookie = allCookies.find((c: string) => c.startsWith('authjs.session-token') || c.startsWith('next-auth.session-token'))
  if (!sessionCookie) throw new Error('Login failed')
  return [csrfCookie, sessionCookie].filter(Boolean).join('; ')
}

async function apiGet(path: string, cookies: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookies } })
  return { status: res.status, data: await res.json() }
}

async function apiPost(path: string, body: unknown, cookies: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json() }
}

async function apiPut(path: string, body: unknown, cookies: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json() }
}

async function main() {
  console.log('\n==============================================')
  console.log('  FONTAINE REAL OLLAMA E2E INTEGRATION TEST')
  console.log('==============================================\n')

  // STEP 1: Verify Ollama is the active provider
  console.log('STEP 1: Login + Verify Ollama Provider')
  let cookies: string
  try {
    cookies = await login('teacher@fontaine.tn', 'fontaine2026')
    assert(!!cookies, 'Teacher logged in')
  } catch (e: any) {
    console.log(`  ❌ Login failed: ${e.message}`)
    process.exit(1)
  }

  const aiStatus = await apiGet('/api/ai/status', cookies)
  assert(aiStatus.status === 200, 'AI status returns 200')
  assert(aiStatus.data.available === true, `AI available: ${aiStatus.data.available}`)
  assert(aiStatus.data.providerType === 'ollama', `Provider is Ollama (got: ${aiStatus.data.providerType})`)
  assert(aiStatus.data.model === 'qwen2.5:3b', `Model is qwen2.5:3b (got: ${aiStatus.data.model})`)

  if (aiStatus.data.providerType !== 'ollama') {
    console.log('\n  ⚠️  NOT using Ollama provider. Aborting real Ollama test.')
    console.log('  Configure OLLAMA_URL in .env and restart the server.')
    process.exit(1)
  }

  // STEP 2: Select curriculum
  console.log('\nSTEP 2: Select 3ème année Arabic Skill')
  const curriculum = await apiGet('/api/curriculum', cookies)
  assert(curriculum.status === 200, 'Curriculum API returns 200')

  const grades = curriculum.data.grades || curriculum.data || []
  const grade = grades[0]
  const subject = grade?.subjects?.[0]
  const unit = subject?.units?.[0]
  assert(!!unit, `Unit: ${unit?.nameAr}`)

  const unitDetail = await apiGet(`/api/curriculum/units/${unit.id}`, cookies)
  const domain = unitDetail.data.domains?.[0]
  const lesson = domain?.lessons?.[0]
  const skill = lesson?.skills?.[0]
  assert(!!skill, `Skill: ${skill?.nameAr} (id: ${skill?.id})`)

  // STEP 3: Generate activity with REAL Ollama
  console.log('\nSTEP 3: Generate Activity with REAL Ollama')
  console.log('  (This may take 10-30 seconds...)')

  const genStart = Date.now()
  const genResult = await apiPost('/api/ai/generate', {
    skillId: skill.id,
    gameType: 'quiz',
    difficulty: 'easy',
    questionCount: 3,
  }, cookies)
  const genDuration = Date.now() - genStart

  console.log(`  Generation took ${(genDuration / 1000).toFixed(1)}s`)
  assert(genResult.status === 200, `Generate returns 200 (got ${genResult.status})`)

  if (genResult.status !== 200) {
    console.log(`  Error: ${JSON.stringify(genResult.data)}`)
    console.log('\n  ⚠️  Real Ollama generation failed. Check model output quality.')
    process.exit(1)
  }

  const aiActivity = genResult.data.activity
  const aiActivityId = genResult.data.activityId
  assert(!!aiActivityId, `Activity ID: ${aiActivityId}`)

  // STEP 4: Validate the AI output
  console.log('\nSTEP 4: Validate AI Output (Zod + draft status)')
  assert(aiActivity?.status === 'draft', `Status is DRAFT (got: ${aiActivity?.status})`)
  assert(aiActivity?.questions?.length > 0, `${aiActivity?.questions?.length} questions generated`)

  let validQuestions = 0
  for (const q of aiActivity?.questions || []) {
    const data = typeof q.data === 'string' ? JSON.parse(q.data) : q.data
    if (data.type === 'quiz' && Array.isArray(data.options) && data.correctOptionId) {
      validQuestions++
      console.log(`    Q: ${q.questionText.substring(0, 60)}...`)
      console.log(`       Options: ${data.options.map((o: any) => o.text).join(' | ')}`)
      console.log(`       Answer: ${data.correctOptionId}`)
    }
  }
  assert(validQuestions > 0, `${validQuestions} questions have valid quiz structure`)

  // Check DB
  const dbAct = await prisma.activity.findUnique({ where: { id: aiActivityId } })
  assert(dbAct?.isAiGenerated === true, 'Marked as AI-generated in DB')
  assert(dbAct?.status === 'draft', 'Status is draft in DB')

  const aiLogs = await prisma.aiLog.findMany({ where: { activityId: aiActivityId } })
  assert(aiLogs.length > 0, `AI log exists (${aiLogs.length})`)
  assert(aiLogs[0].status === 'success', `Log status: ${aiLogs[0].status}`)
  assert(aiLogs[0].model === 'local', `Log model: ${aiLogs[0].model}`)
  assert(aiLogs[0].durationMs > 0, `Duration logged: ${aiLogs[0].durationMs}ms`)

  // STEP 5: Teacher reviews and approves
  console.log('\nSTEP 5: Teacher Reviews and Approves')
  const reviewRes = await apiGet(`/api/activities/${aiActivityId}`, cookies)
  assert(reviewRes.status === 200, 'Can fetch activity for review')

  const approveRes = await apiPut(`/api/activities/${aiActivityId}`, { status: 'published' }, cookies)
  assert(approveRes.status === 200, `Approve: ${approveRes.status}`)

  const published = await prisma.activity.findUnique({ where: { id: aiActivityId } })
  assert(published?.status === 'published', `Activity is now published`)

  // STEP 6: Activity in list
  console.log('\nSTEP 6: Activity Appears in List')
  const actList = await apiGet('/api/activities', cookies)
  const found = (actList.data.activities || actList.data || []).find((a: any) => a.id === aiActivityId)
  assert(!!found, 'Activity in list')
  assert(found?.isAiGenerated === true, 'Marked as AI-generated')
  assert(found?.status === 'published', 'Shows as published')

  // STEP 7: Launch session and students play
  console.log('\nSTEP 7: Launch Session + Students Play')
  const classes = await apiGet('/api/classes', cookies)
  const classData = (Array.isArray(classes.data) ? classes.data : classes.data.classes || [])[0]
  assert(!!classData, `Class: ${classData?.name}`)

  const sessionRes = await apiPost('/api/sessions', { activityId: aiActivityId, classId: classData.id }, cookies)
  assert(sessionRes.status === 200 || sessionRes.status === 201, `Session created`)
  const sessionId = sessionRes.data.id || sessionRes.data.session?.id
  assert(!!sessionId, `Session ID: ${sessionId}`)

  await prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'active', startedAt: new Date() } })

  const students = await prisma.student.findMany({ where: { classId: classData.id }, take: 3 })
  const questions = await prisma.question.findMany({ where: { activityId: aiActivityId }, orderBy: { orderIndex: 'asc' } })
  assert(questions.length > 0, `${questions.length} playable questions`)

  for (const student of students) {
    await prisma.sessionParticipant.create({
      data: { sessionId, studentId: student.id, totalScore: 0 },
    })

    let score = 0
    for (const q of questions) {
      const data = JSON.parse(q.data)
      const isCorrect = Math.random() > 0.4
      await prisma.studentAnswer.create({
        data: {
          sessionId,
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
      where: { sessionId_studentId: { sessionId, studentId: student.id } },
      data: { totalScore: score },
    })
  }

  await prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'completed', completedAt: new Date() } })

  const answerCount = await prisma.studentAnswer.count({ where: { sessionId } })
  assert(answerCount === students.length * questions.length, `${answerCount} answers saved`)

  // STEP 8: Analytics updated
  console.log('\nSTEP 8: Analytics Updated')
  const analytics = await apiGet(`/api/analytics?classId=${classData.id}`, cookies)
  assert(analytics.status === 200, 'Analytics returns 200')
  const classAnalytics = analytics.data.classes?.[0]
  assert(classAnalytics?.totalSessions > 0, `Sessions: ${classAnalytics?.totalSessions}`)

  // STEP 9: Remediation with REAL Ollama
  console.log('\nSTEP 9: Real Ollama Remediation')
  console.log('  (This may take 10-30 seconds...)')

  // Create student results for weak skill detection
  for (const student of students) {
    await prisma.studentResult.upsert({
      where: { studentId_skillId: { studentId: student.id, skillId: skill.id } },
      create: { studentId: student.id, skillId: skill.id, totalAttempts: 5, correctCount: 2, masteryLevel: 'developing', lastAttemptAt: new Date() },
      update: { totalAttempts: { increment: 5 }, correctCount: { increment: 2 }, masteryLevel: 'developing', lastAttemptAt: new Date() },
    })
  }

  const remStart = Date.now()
  const remResult = await apiPost('/api/ai/remediate', {
    skillId: skill.id,
    gameType: 'true_false',
    questionCount: 3,
    classId: classData.id,
  }, cookies)
  const remDuration = Date.now() - remStart
  console.log(`  Remediation took ${(remDuration / 1000).toFixed(1)}s`)

  assert(remResult.status === 200, `Remediation returns 200 (got ${remResult.status})`)
  if (remResult.status === 200) {
    assert(remResult.data.activity?.status === 'draft', 'Remediation is draft')
    assert(remResult.data.activity?.questions?.length > 0, `${remResult.data.activity?.questions?.length} remediation questions`)

    // Approve remediation too
    const remApprove = await apiPut(`/api/activities/${remResult.data.activityId}`, { status: 'published' }, cookies)
    assert(remApprove.status === 200, 'Remediation approved')
  } else {
    console.log(`  Error: ${JSON.stringify(remResult.data)}`)
  }

  // STEP 10: Chat with REAL Ollama
  console.log('\nSTEP 10: Real Ollama Teacher Chat')
  const chatStart = Date.now()
  const chatResult = await apiPost('/api/ai/chat', {
    messages: [{ role: 'user', content: `كيف أعلّم مهارة ${skill.nameAr} لتلاميذ السنة الثالثة؟` }],
    classId: classData.id,
    skillId: skill.id,
  }, cookies)
  const chatDuration = Date.now() - chatStart
  console.log(`  Chat took ${(chatDuration / 1000).toFixed(1)}s`)

  assert(chatResult.status === 200, `Chat returns 200 (got ${chatResult.status})`)
  if (chatResult.status === 200) {
    assert(chatResult.data.message?.content?.length > 0, `Chat response: ${chatResult.data.message?.content?.substring(0, 80)}...`)
  }

  // STEP 11: Explain with REAL Ollama
  console.log('\nSTEP 11: Real Ollama Mistake Explanation')
  const expStart = Date.now()
  const expResult = await apiPost('/api/ai/explain', {
    skillId: skill.id,
    classId: classData.id,
  }, cookies)
  const expDuration = Date.now() - expStart
  console.log(`  Explanation took ${(expDuration / 1000).toFixed(1)}s`)

  assert(expResult.status === 200, `Explain returns 200 (got ${expResult.status})`)
  if (expResult.status === 200) {
    assert(expResult.data.explanation?.length > 0, `Explanation: ${expResult.data.explanation?.substring(0, 80)}...`)
  }

  // SUMMARY
  console.log('\n==============================================')
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
  console.log('==============================================')
  console.log(`\n  Provider: Ollama (qwen2.5:3b)`)
  console.log(`  Generation: ${(genDuration / 1000).toFixed(1)}s`)
  console.log(`  Remediation: ${(remDuration / 1000).toFixed(1)}s`)
  console.log(`  Chat: ${(chatDuration / 1000).toFixed(1)}s`)
  console.log(`  Explanation: ${(expDuration / 1000).toFixed(1)}s\n`)

  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Test error:', e); process.exit(1) })
