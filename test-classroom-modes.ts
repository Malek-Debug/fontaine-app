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

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Expected JSON from ${res.url} (${res.status}) but got: ${text.substring(0, 120)}`)
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
  if (!sessionCookie) throw new Error('Login failed - no session cookie')
  return [csrfCookie, sessionCookie].filter(Boolean).join('; ')
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

async function main() {
  console.log('\n==============================================')
  console.log('  FONTAINE CLASSROOM MODES TEST')
  console.log('==============================================\n')

  // Login
  console.log('STEP 1: Teacher Login')
  const cookies = await login('teacher@fontaine.tn', 'fontaine2026')
  assert(!!cookies, 'Teacher logged in')

  // Get class and activity
  const classesRes = await apiGet('/api/classes', cookies)
  const classData = classesRes.data[0]
  assert(!!classData, `Has class: ${classData?.name}`)

  const activitiesRes = await apiGet('/api/activities', cookies)
  const activity = activitiesRes.data.find((a: any) => a.questions?.length > 0 || a._count?.questions > 0)
  assert(!!activity, `Has activity: ${activity?.titleAr}`)

  // ============================================
  // TEST A: TEACHER-LED MODE
  // ============================================
  console.log('\n--- TEST A: TEACHER-LED MODE ---\n')

  console.log('A1: Create Teacher-Led Session')
  const tlSession = await apiPost('/api/sessions', {
    activityId: activity.id,
    classId: classData.id,
    mode: 'teacher_led',
  }, cookies)
  assert(tlSession.status === 201, `Teacher-led session created (${tlSession.status})`)
  assert(tlSession.data.mode === 'teacher_led', `Mode is teacher_led (${tlSession.data.mode})`)
  assert(!!tlSession.data.code, `Has game code: ${tlSession.data.code}`)
  assert(tlSession.data.teams?.length === 0 || !tlSession.data.teams, 'No teams in teacher-led mode')

  console.log('\nA2: Session Has Questions')
  const questions = tlSession.data.activity?.questions || []
  assert(questions.length > 0, `Activity has ${questions.length} questions`)

  console.log('\nA3: Submit Class Answer (via API)')
  if (questions.length > 0) {
    const q = questions[0]
    const qData = JSON.parse(q.data)
    let answerPayload: string
    if (q.questionType === 'quiz') {
      answerPayload = JSON.stringify({ selectedOptionId: qData.correctOptionId })
    } else if (q.questionType === 'true_false') {
      answerPayload = JSON.stringify({ selectedAnswer: qData.correctAnswer })
    } else {
      answerPayload = JSON.stringify({})
    }

    const answerRes = await apiPost(`/api/game/${tlSession.data.id}/class-answer`, {
      questionId: q.id,
      answer: answerPayload,
    }, cookies)
    assert(answerRes.status === 200, `Class answer submitted (${answerRes.status})`)
    assert(answerRes.data.isCorrect === true, `Answer is correct: ${answerRes.data.isCorrect}`)
    assert(!!answerRes.data.correctAnswer, 'Correct answer returned')
  }

  console.log('\nA4: Get Class Answers')
  const classAnswers = await apiGet(`/api/game/${tlSession.data.id}/class-answer`, cookies)
  assert(classAnswers.status === 200, `Class answers API returns 200`)
  assert(classAnswers.data.responses?.length > 0, `Has ${classAnswers.data.responses?.length} responses`)
  assert(classAnswers.data.summary?.correctCount > 0, `Correct count: ${classAnswers.data.summary?.correctCount}`)

  console.log('\nA5: Complete and Get Results')
  await prisma.gameSession.update({
    where: { id: tlSession.data.id },
    data: { status: 'completed', completedAt: new Date() },
  })
  const tlResults = await apiGet(`/api/sessions/results/${tlSession.data.id}`, cookies)
  assert(tlResults.status === 200, `Teacher-led results API returns 200`)
  assert(tlResults.data.mode === 'teacher_led', `Results mode is teacher_led`)
  assert(!!tlResults.data.classResults, 'Has classResults')
  assert(tlResults.data.classResults?.correctCount > 0, `Class correct: ${tlResults.data.classResults?.correctCount}`)

  // ============================================
  // TEST B: TEAM MODE
  // ============================================
  console.log('\n--- TEST B: TEAM MODE ---\n')

  console.log('B1: Create Team Session')
  const teamSession = await apiPost('/api/sessions', {
    activityId: activity.id,
    classId: classData.id,
    mode: 'team',
    teamCount: 3,
    showLeaderboard: true,
  }, cookies)
  assert(teamSession.status === 201, `Team session created (${teamSession.status})`)
  assert(teamSession.data.mode === 'team', `Mode is team (${teamSession.data.mode})`)
  assert(teamSession.data.teams?.length === 3, `Has ${teamSession.data.teams?.length} teams`)

  console.log('\nB2: Teams have correct properties')
  const teams = teamSession.data.teams || []
  assert(teams.every((t: any) => t.name && t.color), 'All teams have name and color')
  assert(teams[0]?.name === 'الفريق الأزرق', `First team: ${teams[0]?.name}`)
  assert(teams[1]?.name === 'الفريق الأخضر', `Second team: ${teams[1]?.name}`)
  assert(teams[2]?.name === 'الفريق الأحمر', `Third team: ${teams[2]?.name}`)

  console.log('\nB3: Get Teams API')
  const teamsRes = await apiGet(`/api/game/${teamSession.data.id}/teams`, cookies)
  assert(teamsRes.status === 200, `Teams API returns 200`)
  assert(teamsRes.data.length === 3, `Teams API returns ${teamsRes.data.length} teams`)

  console.log('\nB4: Create Additional Team')
  const newTeam = await apiPost(`/api/game/${teamSession.data.id}/teams`, {
    name: 'الفريق الذهبي',
    color: '#FFD700',
  }, cookies)
  assert(newTeam.status === 201, `New team created (${newTeam.status})`)
  assert(newTeam.data.name === 'الفريق الذهبي', `Team name: ${newTeam.data.name}`)

  console.log('\nB5: Assign Students to Teams')
  const students = await prisma.student.findMany({ where: { classId: classData.id }, take: 6 })
  assert(students.length >= 6, `Has ${students.length} students`)

  for (let i = 0; i < Math.min(students.length, 4); i++) {
    const teamId = teams[i % teams.length].id
    await prisma.sessionParticipant.upsert({
      where: { sessionId_studentId: { sessionId: teamSession.data.id, studentId: students[i].id } },
      create: { sessionId: teamSession.data.id, studentId: students[i].id, teamId, totalScore: 10 * (i + 1) },
      update: { teamId, totalScore: 10 * (i + 1) },
    })
  }

  const participants = await prisma.sessionParticipant.findMany({
    where: { sessionId: teamSession.data.id },
    include: { team: true },
  })
  const assignedCount = participants.filter((p) => p.teamId).length
  assert(assignedCount >= 3, `${assignedCount} students assigned to teams`)

  console.log('\nB6: Team Session Results')
  await prisma.gameSession.update({
    where: { id: teamSession.data.id },
    data: { status: 'completed', completedAt: new Date(), startedAt: new Date() },
  })
  const teamResults = await apiGet(`/api/sessions/results/${teamSession.data.id}`, cookies)
  assert(teamResults.status === 200, `Team results returns 200`)
  assert(teamResults.data.mode === 'team', `Results mode is team`)
  assert(Array.isArray(teamResults.data.teamLeaderboard), 'Has teamLeaderboard')
  assert(teamResults.data.teamLeaderboard?.length >= 3, `Team leaderboard has ${teamResults.data.teamLeaderboard?.length} teams`)

  // ============================================
  // TEST C: INDIVIDUAL MODE (REGRESSION)
  // ============================================
  console.log('\n--- TEST C: INDIVIDUAL MODE (REGRESSION) ---\n')

  console.log('C1: Create Individual Session (default mode)')
  const indSession = await apiPost('/api/sessions', {
    activityId: activity.id,
    classId: classData.id,
  }, cookies)
  assert(indSession.status === 201, `Individual session created (${indSession.status})`)
  assert(indSession.data.mode === 'individual', `Mode defaults to individual (${indSession.data.mode})`)
  assert(!indSession.data.teams || indSession.data.teams.length === 0, 'No teams in individual mode')

  console.log('\nC2: Individual Session with explicit mode')
  const indSession2 = await apiPost('/api/sessions', {
    activityId: activity.id,
    classId: classData.id,
    mode: 'individual',
  }, cookies)
  assert(indSession2.status === 201, `Explicit individual session created`)
  assert(indSession2.data.mode === 'individual', 'Mode is individual')

  console.log('\nC3: Session lookup by code includes mode')
  const lookupRes = await apiGet(`/api/sessions/${teamSession.data.code}`, cookies)
  assert(lookupRes.status === 200, 'Session lookup by code works')
  assert(lookupRes.data.mode === 'team', `Lookup returns mode: ${lookupRes.data.mode}`)
  assert(Array.isArray(lookupRes.data.teams), 'Lookup includes teams')

  // ============================================
  // TEST D: SECURITY
  // ============================================
  console.log('\n--- TEST D: SECURITY ---\n')

  console.log('D1: Class answer requires auth')
  const noAuthAnswer = await fetch(`${BASE}/api/game/${tlSession.data.id}/class-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId: 'x', answer: '{}' }),
  })
  assert(noAuthAnswer.status === 401, `Class answer rejects unauth (${noAuthAnswer.status})`)

  console.log('\nD2: Teams API requires auth')
  const noAuthTeams = await fetch(`${BASE}/api/game/${teamSession.data.id}/teams`)
  assert(noAuthTeams.status === 401, `Teams API rejects unauth (${noAuthTeams.status})`)

  console.log('\nD3: Class answer only works for teacher-led sessions')
  const wrongModeAnswer = await apiPost(`/api/game/${teamSession.data.id}/class-answer`, {
    questionId: questions[0]?.id || 'x',
    answer: '{}',
  }, cookies)
  assert(wrongModeAnswer.status === 404, `Class answer rejects non-teacher-led (${wrongModeAnswer.status})`)

  console.log('\nD4: Team creation only works for team sessions')
  const wrongModeTeam = await apiPost(`/api/game/${tlSession.data.id}/teams`, {
    name: 'Should fail',
  }, cookies)
  assert(wrongModeTeam.status === 404, `Team creation rejects non-team session (${wrongModeTeam.status})`)

  // ============================================
  // TEST E: QR CODE / JOIN
  // ============================================
  console.log('\n--- TEST E: SESSION LOOKUP ---\n')

  console.log('E1: Individual session lookup')
  const indLookup = await apiGet(`/api/sessions/${indSession.data.code}`, cookies)
  assert(indLookup.status === 200, 'Individual session lookup works')
  assert(indLookup.data.mode === 'individual', 'Individual mode in lookup')

  console.log('\nE2: Team session lookup includes teams')
  const teamLookup = await apiGet(`/api/sessions/${teamSession.data.code}`, cookies)
  assert(teamLookup.status === 200, 'Team session lookup works')
  assert(teamLookup.data.teams?.length >= 3, `Teams in lookup: ${teamLookup.data.teams?.length}`)

  // ============================================
  // TEST F: GAME COMPATIBILITY
  // ============================================
  console.log('\n--- TEST F: ALL 8 GAME TYPES + MODES ---\n')

  const gameTypes = ['quiz', 'true_false', 'matching', 'sentence_builder', 'order_story', 'grammar_detective', 'find_mistake', 'vocabulary']
  const allActivities = activitiesRes.data || []
  const gameTypeSessionIds: string[] = []

  for (const gameType of gameTypes) {
    const act = allActivities.find((a: any) => a.gameType === gameType && (a.questions?.length > 0 || a._count?.questions > 0))
    if (!act) {
      console.log(`  ⚠️  No ${gameType} activity found, skipping`)
      continue
    }

    try {
      const tlRes = await apiPost('/api/sessions', { activityId: act.id, classId: classData.id, mode: 'teacher_led' }, cookies)
      assert(tlRes.status === 201, `${gameType}: teacher-led session created`)
      if (tlRes.data.id) gameTypeSessionIds.push(tlRes.data.id)

      const tmRes = await apiPost('/api/sessions', { activityId: act.id, classId: classData.id, mode: 'team', teamCount: 2 }, cookies)
      assert(tmRes.status === 201, `${gameType}: team session created`)
      assert(tmRes.data.teams?.length === 2, `${gameType}: has 2 teams`)
      if (tmRes.data.id) gameTypeSessionIds.push(tmRes.data.id)
    } catch (err: any) {
      console.log(`  ⚠️  ${gameType}: error (${err.message?.substring(0, 60)})`)
    }
  }

  // ============================================
  // TEST G: PAGE RENDERING
  // ============================================
  console.log('\n--- TEST G: PAGE RENDERING ---\n')

  const projectorRes = await fetch(`${BASE}/ar/teacher/sessions/${tlSession.data.id}/projector`)
  assert(projectorRes.status === 200, `Projector page loads (${projectorRes.status})`)

  const liveRes = await fetch(`${BASE}/ar/teacher/sessions/${teamSession.data.id}/live`)
  assert(liveRes.status === 200, `Live page loads (${liveRes.status})`)

  const joinRes = await fetch(`${BASE}/ar/join`)
  assert(joinRes.status === 200, `Join page loads (${joinRes.status})`)

  // ============================================
  // CLEANUP
  // ============================================
  console.log('\n--- CLEANUP ---\n')
  const sessionIds = [tlSession.data.id, teamSession.data.id, indSession.data.id, indSession2.data.id, ...gameTypeSessionIds]
  for (const sid of sessionIds) {
    await prisma.classResponse.deleteMany({ where: { sessionId: sid } }).catch(() => {})
    await prisma.studentAnswer.deleteMany({ where: { sessionId: sid } }).catch(() => {})
    await prisma.sessionParticipant.deleteMany({ where: { sessionId: sid } }).catch(() => {})
    await prisma.team.deleteMany({ where: { sessionId: sid } }).catch(() => {})
    await prisma.gameSession.delete({ where: { id: sid } }).catch(() => {})
  }
  console.log('  ✅ Cleanup complete')

  // ============================================
  // RESULTS
  // ============================================
  console.log('\n==============================================')
  console.log(`  CLASSROOM MODES TEST RESULTS: ${passed} passed, ${failed} failed`)
  console.log('==============================================\n')

  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
