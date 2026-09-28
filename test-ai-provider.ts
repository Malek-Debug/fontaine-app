import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env manually (no dotenv package)
try {
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.substring(0, eqIdx).trim()
    let value = trimmed.substring(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
} catch {}

import { OllamaAiProvider } from './src/lib/ai/providers/ollama'
import { MockAiProvider } from './src/lib/ai/providers/mock'
import { validateAiActivityOutput } from './src/lib/ai/validation'
import { AiError } from './src/lib/ai/types'
import { setAiProvider, getAiProvider, isAiAvailable, callAi, chatAi } from './src/lib/ai/client'
import { initializeAiProvider, resetAiProvider } from './src/lib/ai/init'

let passed = 0
let failed = 0
let skipped = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${msg}`)
    failed++
  }
}

function skip(msg: string) {
  console.log(`  ⏭️  SKIP: ${msg}`)
  skipped++
}

// ========== UNIT TESTS (always run, no Ollama dependency) ==========

async function testMockProvider() {
  console.log('\n=== MOCK PROVIDER TESTS ===')

  const mock = new MockAiProvider()

  assert(mock.name === 'mock', `Mock name is "mock"`)
  assert(await mock.isAvailable() === true, 'Mock is always available')

  // Test quiz generation
  const quizResult = await mock.complete('أنشئ نشاطًا "questionType": "quiz" 3 أسئلة', {})
  assert(quizResult.content.length > 0, 'Quiz generation returns content')
  const quizJson = JSON.parse(quizResult.content)
  assert(quizJson.questions?.length === 3, `Quiz has 3 questions (got ${quizJson.questions?.length})`)

  // Test true_false generation
  const tfResult = await mock.complete('أنشئ نشاطًا "questionType": "true_false" 2 أسئلة', {})
  const tfJson = JSON.parse(tfResult.content)
  assert(tfJson.questions?.length === 2, `True/false has 2 questions`)
  assert(tfJson.questions[0].data.type === 'true_false', 'True/false data type is correct')

  // Test all 8 game types
  const gameTypes = ['quiz', 'true_false', 'matching', 'sentence_builder', 'order_story', 'grammar_detective', 'find_mistake', 'vocabulary']
  for (const gt of gameTypes) {
    const res = await mock.complete(`أنشئ نشاطًا "questionType": "${gt}" 1 أسئلة`, {})
    const json = JSON.parse(res.content)
    assert(json.questions?.length === 1, `${gt}: generates 1 question`)
  }

  // Test chat
  const chatResult = await mock.chat([{ role: 'user', content: 'مرحبا' }], {})
  assert(chatResult.content.length > 0, 'Chat returns response')

  // Test explanation
  const explainResult = await mock.complete('تحليل أخطاء', {})
  assert(explainResult.content.includes('تحليل'), 'Explanation contains analysis')
}

async function testOllamaProviderConstruction() {
  console.log('\n=== OLLAMA PROVIDER CONSTRUCTION TESTS ===')

  // No URL = not available (save and clear env to test)
  const savedUrl = process.env.OLLAMA_URL
  delete process.env.OLLAMA_URL
  const noUrl = new OllamaAiProvider({ baseUrl: '' })
  assert(await noUrl.isAvailable() === false, 'Empty URL → not available')
  if (savedUrl) process.env.OLLAMA_URL = savedUrl

  // Bad URL = not available
  const badUrl = new OllamaAiProvider({ baseUrl: 'http://localhost:99999' })
  assert(await badUrl.isAvailable() === false, 'Bad URL → not available')

  // Constructor stores model name
  const custom = new OllamaAiProvider({ baseUrl: 'http://test:11434', model: 'my-model' })
  assert(custom.getModelName() === 'my-model', 'Custom model name stored')
  assert(custom.name === 'ollama:my-model', 'Name includes model')
  assert(custom.getBaseUrl() === 'http://test:11434', 'Base URL stored')

  // Default model
  const defaults = new OllamaAiProvider({ baseUrl: 'http://test:11434' })
  assert(defaults.getModelName() === (process.env.OLLAMA_MODEL || 'qwen2.5:3b'), 'Default model from env or qwen2.5:3b')
}

async function testValidation() {
  console.log('\n=== VALIDATION TESTS ===')

  // Valid quiz JSON
  const validQuiz = JSON.stringify({
    title: 'Test',
    titleAr: 'اختبار',
    description: 'test',
    descriptionAr: 'اختبار',
    questions: [{
      questionText: 'سؤال؟',
      questionType: 'quiz',
      data: {
        type: 'quiz',
        options: [
          { id: 'a', text: 'خيار 1' },
          { id: 'b', text: 'خيار 2' },
        ],
        correctOptionId: 'a',
      },
      explanation: 'شرح',
    }],
  })

  const result = validateAiActivityOutput(validQuiz, 'quiz', 1)
  assert(result.activity.questions.length === 1, 'Valid quiz passes validation')
  assert(result.activity.titleAr === 'اختبار', 'Title preserved')

  // JSON wrapped in markdown code block
  const markdownWrapped = '```json\n' + validQuiz + '\n```'
  const mdResult = validateAiActivityOutput(markdownWrapped, 'quiz', 1)
  assert(mdResult.activity.questions.length === 1, 'Markdown-wrapped JSON parsed')

  // JSON with leading text
  const withLeading = 'Here is the activity:\n' + validQuiz
  const leadResult = validateAiActivityOutput(withLeading, 'quiz', 1)
  assert(leadResult.activity.questions.length === 1, 'Leading text stripped')

  // JSON with trailing comma
  const trailingComma = validQuiz.replace('}"', '}",').replace(/,$/, '')
  // This may or may not pass depending on where the comma is; test that it doesn't crash
  try {
    validateAiActivityOutput(trailingComma, 'quiz', 1)
    assert(true, 'Trailing comma handled gracefully')
  } catch (e) {
    if (e instanceof AiError) {
      assert(true, 'Trailing comma causes clean AiError')
    } else {
      assert(false, 'Trailing comma causes unexpected error')
    }
  }

  // Invalid JSON
  try {
    validateAiActivityOutput('not json at all', 'quiz', 1)
    assert(false, 'Should reject invalid JSON')
  } catch (e) {
    assert(e instanceof AiError && e.type === 'invalid_response', 'Invalid JSON throws AiError')
  }

  // Empty questions
  try {
    validateAiActivityOutput(JSON.stringify({
      title: 'T', titleAr: 'ت', questions: [],
    }), 'quiz', 1)
    assert(false, 'Should reject zero questions')
  } catch (e) {
    assert(e instanceof AiError, 'Zero questions throws AiError')
  }

  // Wrong game type data (quiz data for true_false type)
  const wrongType = JSON.stringify({
    title: 'T', titleAr: 'ت', description: '', descriptionAr: '',
    questions: [{
      questionText: 'سؤال',
      questionType: 'true_false',
      data: {
        type: 'quiz',
        options: [{ id: 'a', text: 'x' }],
        correctOptionId: 'a',
      },
    }],
  })
  try {
    validateAiActivityOutput(wrongType, 'true_false', 1)
    assert(false, 'Should reject wrong game type data')
  } catch (e) {
    assert(e instanceof AiError, 'Wrong type data rejected')
  }

  // Missing correct answer
  const missingAnswer = JSON.stringify({
    title: 'T', titleAr: 'ت', description: '', descriptionAr: '',
    questions: [{
      questionText: 'سؤال',
      questionType: 'quiz',
      data: {
        type: 'quiz',
        options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }],
        // correctOptionId missing
      },
    }],
  })
  try {
    validateAiActivityOutput(missingAnswer, 'quiz', 1)
    assert(false, 'Should reject missing correctOptionId')
  } catch (e) {
    assert(e instanceof AiError, 'Missing answer rejected')
  }

  // Partial validation: 2 valid + 1 invalid = 2 pass
  const partialValid = JSON.stringify({
    title: 'T', titleAr: 'ت', description: '', descriptionAr: '',
    questions: [
      { questionText: 'q1', questionType: 'quiz', data: { options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], correctOptionId: 'a' } },
      { questionText: 'q2', questionType: 'quiz', data: { options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], correctOptionId: 'a' } },
      { questionText: 'q3', questionType: 'quiz', data: { bad: true } },
    ],
  })
  const partialResult = validateAiActivityOutput(partialValid, 'quiz', 3)
  assert(partialResult.activity.questions.length === 2, `Partial: 2 of 3 questions pass (got ${partialResult.activity.questions.length})`)
}

async function testInitProvider() {
  console.log('\n=== INIT PROVIDER TESTS ===')

  // Save original env
  const origUrl = process.env.OLLAMA_URL
  const origModel = process.env.OLLAMA_MODEL
  const origMock = process.env.AI_MOCK
  const origEnv = process.env.NODE_ENV

  // Test: AI_MOCK=true forces mock
  resetAiProvider()
  setAiProvider(null as any)
  process.env.AI_MOCK = 'true'
  process.env.OLLAMA_URL = 'http://localhost:11434'
  await initializeAiProvider()
  const mockProvider = getAiProvider()
  assert(mockProvider?.name === 'mock', 'AI_MOCK=true forces mock provider')

  // Test: No OLLAMA_URL in dev = mock fallback
  resetAiProvider()
  setAiProvider(null as any)
  delete process.env.AI_MOCK
  delete process.env.OLLAMA_URL
  const savedNodeEnv = process.env.NODE_ENV
  ;(process.env as Record<string, string | undefined>).NODE_ENV = 'development'
  await initializeAiProvider()
  const devProvider = getAiProvider()
  assert(devProvider?.name === 'mock', 'Dev mode without OLLAMA_URL falls back to mock')
  ;(process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv

  // Restore env
  if (origUrl) process.env.OLLAMA_URL = origUrl; else delete process.env.OLLAMA_URL
  if (origModel) process.env.OLLAMA_MODEL = origModel; else delete process.env.OLLAMA_MODEL
  if (origMock) process.env.AI_MOCK = origMock; else delete process.env.AI_MOCK
  resetAiProvider()
}

async function testClientFunctions() {
  console.log('\n=== CLIENT FUNCTIONS TESTS ===')

  // Set mock provider
  const mock = new MockAiProvider()
  setAiProvider(mock)

  assert(await isAiAvailable() === true, 'isAiAvailable with mock = true')

  const aiResult = await callAi('أنشئ نشاطًا "questionType": "quiz" 2 أسئلة', {})
  assert(aiResult.content.length > 0, 'callAi returns content')

  const chatResult = await chatAi([{ role: 'user', content: 'مرحبا' }], {})
  assert(chatResult.content.length > 0, 'chatAi returns content')

  // No provider
  setAiProvider(null as any)
  assert(await isAiAvailable() === false, 'isAiAvailable with no provider = false')

  try {
    await callAi('test', {})
    assert(false, 'callAi should throw without provider')
  } catch (e) {
    assert(e instanceof AiError, 'callAi throws AiError without provider')
  }
}

// ========== REAL OLLAMA INTEGRATION TESTS (only if Ollama running) ==========

async function testRealOllama() {
  console.log('\n=== REAL OLLAMA INTEGRATION TESTS ===')

  const ollamaUrl = process.env.OLLAMA_URL
  if (!ollamaUrl) {
    skip('OLLAMA_URL not set — skipping real Ollama tests')
    return
  }

  const provider = new OllamaAiProvider({
    baseUrl: ollamaUrl,
    model: process.env.OLLAMA_MODEL,
  })

  const available = await provider.isAvailable()
  if (!available) {
    skip(`Ollama not available at ${ollamaUrl} with model ${provider.getModelName()}`)
    return
  }

  assert(true, `Ollama connected: ${provider.name} at ${provider.getBaseUrl()}`)

  // Test 1: Simple text completion
  console.log('  Testing simple completion...')
  const simpleResult = await provider.complete('أجب بـ JSON فقط: {"greeting": "مرحبا"}', {
    system: 'أنت مساعد. أجب بـ JSON صالح فقط.',
    temperature: 0.1,
    maxTokens: 256,
  })
  assert(simpleResult.content.length > 0, `Simple completion returned ${simpleResult.content.length} chars in ${simpleResult.durationMs}ms`)
  console.log(`    Response: ${simpleResult.content.substring(0, 100)}`)

  // Test 2: JSON structure generation
  console.log('  Testing structured JSON generation...')
  const jsonResult = await provider.complete(
    `أنشئ نشاطًا تعليميًا من نوع "اختبار قصير (Quiz)" يحتوي على 2 أسئلة.

أجب بـ JSON بالشكل التالي بالضبط:
{
  "title": "Quiz Title",
  "titleAr": "عنوان بالعربية",
  "description": "description",
  "descriptionAr": "وصف بالعربية",
  "questions": [
    {
      "questionText": "نص السؤال بالعربية",
      "questionType": "quiz",
      "data": {
        "type": "quiz",
        "options": [
          { "id": "a", "text": "خيار 1" },
          { "id": "b", "text": "خيار 2" },
          { "id": "c", "text": "خيار 3" }
        ],
        "correctOptionId": "a"
      },
      "explanation": "شرح"
    }
  ]
}

أنشئ بالضبط 2 أسئلة. لا تُولّد محتوى خارج النطاق. أجب بـ JSON فقط.`,
    {
      system: 'أنت مُنشئ محتوى تعليمي باللغة العربية لتلاميذ تونسيين في السنة الثالثة ابتدائي (8-9 سنوات). أجب بـ JSON صالح فقط.',
      temperature: 0.3,
      maxTokens: 2048,
    }
  )

  assert(jsonResult.content.length > 0, `JSON generation returned ${jsonResult.content.length} chars in ${jsonResult.durationMs}ms`)

  // Try to validate with Zod
  try {
    const validated = validateAiActivityOutput(jsonResult.content, 'quiz', 2)
    assert(validated.activity.questions.length > 0, `Zod validation passed: ${validated.activity.questions.length} valid questions`)
    assert(validated.activity.titleAr.length > 0, `Has Arabic title: ${validated.activity.titleAr}`)
    for (const q of validated.activity.questions) {
      assert(q.questionType === 'quiz', 'Question type is quiz')
      const data = q.data as any
      assert(Array.isArray(data.options), 'Has options array')
      assert(typeof data.correctOptionId === 'string', 'Has correctOptionId')
    }
    console.log(`    ✅ Real Ollama quiz generation + Zod validation PASSED`)
  } catch (e) {
    console.log(`    Raw Ollama output: ${jsonResult.content.substring(0, 500)}`)
    if (e instanceof AiError) {
      assert(false, `Zod validation failed: ${e.message}`)
    } else {
      assert(false, `Unexpected error: ${e}`)
    }
  }

  // Test 3: Chat
  console.log('  Testing chat...')
  const chatResult = await provider.chat([
    { role: 'user', content: 'ما هي أفضل طريقة لتعليم الجملة الاسمية لتلاميذ السنة الثالثة؟' },
  ], {
    system: 'أنت مساعد تدريس ذكي. أجب بالعربية.',
    temperature: 0.5,
    maxTokens: 512,
  })
  assert(chatResult.content.length > 0, `Chat returned ${chatResult.content.length} chars in ${chatResult.durationMs}ms`)
  console.log(`    Chat response: ${chatResult.content.substring(0, 100)}...`)

  // Test 4: True/false generation
  console.log('  Testing true_false generation...')
  const tfResult = await provider.complete(
    `أنشئ نشاطًا تعليميًا من نوع "صحيح أو خطأ" يحتوي على 2 أسئلة.

أجب بـ JSON بالشكل التالي بالضبط:
{
  "title": "True False Quiz",
  "titleAr": "صحيح أو خطأ",
  "description": "test",
  "descriptionAr": "اختبار",
  "questions": [
    {
      "questionText": "نص السؤال",
      "questionType": "true_false",
      "data": {
        "type": "true_false",
        "statement": "العبارة هنا",
        "correctAnswer": true
      },
      "explanation": "شرح"
    }
  ]
}

أنشئ بالضبط 2 أسئلة. أجب بـ JSON فقط.`,
    {
      system: 'أنت مُنشئ محتوى تعليمي. أجب بـ JSON صالح فقط.',
      temperature: 0.3,
      maxTokens: 1024,
    }
  )

  try {
    const tfValidated = validateAiActivityOutput(tfResult.content, 'true_false', 2)
    assert(tfValidated.activity.questions.length > 0, `True/false: ${tfValidated.activity.questions.length} valid questions`)
    console.log(`    ✅ Real Ollama true_false generation PASSED`)
  } catch (e) {
    console.log(`    Raw output: ${tfResult.content.substring(0, 300)}`)
    assert(false, `True/false validation failed: ${e instanceof Error ? e.message : e}`)
  }
}

// ========== SECURITY TESTS ==========

async function testSecurity() {
  console.log('\n=== SECURITY TESTS (API authentication) ===')
  const BASE = 'http://localhost:3000'

  const endpoints = [
    { method: 'POST', path: '/api/ai/generate', body: '{"skillId":"x","gameType":"quiz","difficulty":"easy","questionCount":1}' },
    { method: 'POST', path: '/api/ai/remediate', body: '{"skillId":"x"}' },
    { method: 'POST', path: '/api/ai/chat', body: '{"messages":[{"role":"user","content":"test"}]}' },
    { method: 'POST', path: '/api/ai/explain', body: '{"skillId":"x"}' },
    { method: 'GET', path: '/api/ai/status', body: null },
  ]

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : {},
        body: ep.body,
      })
      assert(res.status === 401, `${ep.method} ${ep.path} rejects unauth (${res.status})`)
    } catch {
      skip(`Cannot reach ${ep.path}`)
    }
  }
}

// ========== MAIN ==========

async function main() {
  console.log('\n==========================================')
  console.log('  FONTAINE AI PROVIDER TEST SUITE')
  console.log('==========================================')

  await testMockProvider()
  await testOllamaProviderConstruction()
  await testValidation()
  await testInitProvider()
  await testClientFunctions()
  await testRealOllama()
  await testSecurity()

  console.log('\n==========================================')
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`)
  console.log('==========================================\n')

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Test error:', e); process.exit(1) })
