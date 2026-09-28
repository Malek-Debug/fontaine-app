# Ollama Setup Guide for Fontaine

Fontaine uses **Ollama** as a local, free AI provider. No paid API keys, no cloud dependencies, no student data sent externally.

## What is Ollama?

[Ollama](https://ollama.com) runs open-source AI models locally on your computer. Fontaine uses it to:
- Generate educational activities (quiz, true/false, matching, etc.)
- Create remediation exercises for weak skills
- Provide a curriculum-aware teacher chat assistant
- Explain student mistake patterns

All AI content is created as **drafts** — the teacher always reviews and approves before publishing.

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4 GB free | 8+ GB free |
| Disk | 3 GB for model | 5+ GB |
| CPU | Any modern CPU | Multi-core |
| GPU | Not required | Optional (faster) |

The default model (`qwen2.5:3b`) runs on CPU without a dedicated GPU.

## Installation

### 1. Install Ollama

**Windows:**
Download from https://ollama.com/download/windows

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Start Ollama

Ollama runs as a background service. After installation:

**Windows:** Ollama starts automatically. Look for the Ollama icon in the system tray.

**macOS/Linux:**
```bash
ollama serve
```

Verify it's running:
```bash
curl http://localhost:11434/
# Should return: "Ollama is running"
```

### 3. Download the Model

```bash
ollama pull qwen2.5:3b
```

This downloads ~1.9 GB. It only needs to be done once.

#### Why qwen2.5:3b?

- **Small**: 1.9 GB, runs on any modern computer
- **Arabic support**: Strong multilingual capabilities including Modern Standard Arabic
- **Fast**: Generates quiz questions in 5-15 seconds
- **32K context**: Large enough for curriculum context + question generation

#### Alternative Models

If you have more RAM or a GPU, you can use larger models for better quality:

```bash
# 7B parameter model (~4.4 GB) — better quality, needs 8+ GB RAM
ollama pull qwen2.5:7b

# Update .env to use it
OLLAMA_MODEL="qwen2.5:7b"
```

### 4. Configure Fontaine

Edit `.env` in the Fontaine project root:

```env
# Enable Ollama (required — without this, Ollama is not used)
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:3b"
```

### 5. Start Fontaine

```bash
npm run dev
# or
npx tsx server.ts
```

### 6. Verify AI Status

1. Log in as a teacher
2. Go to **AI Generate** (إنشاء بالذكاء الاصطناعي) in the sidebar
3. You should see a green status bar showing: `ذكاء اصطناعي محلي: qwen2.5:3b (Ollama)`

Or check via API:
```bash
# After logging in, check the status endpoint
curl http://localhost:3000/api/ai/status
# Response: {"available":true,"provider":"ollama:qwen2.5:3b","providerType":"ollama","model":"qwen2.5:3b"}
```

## Provider Selection Logic

Fontaine selects the AI provider in this order:

1. **AI_MOCK=true** → Mock provider (for development/testing)
2. **OLLAMA_URL set** → Ollama provider (if Ollama is running and model is available)
3. **Development mode** (no OLLAMA_URL) → Mock provider fallback
4. **Production** (no OLLAMA_URL) → AI features disabled (app works normally without AI)

## Switching Between Mock and Ollama

**Use mock provider** (for testing without Ollama):
```env
AI_MOCK="true"
```

**Use Ollama** (for real AI generation):
```env
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:3b"
# Make sure AI_MOCK is NOT set or commented out
```

**Disable AI entirely:**
```env
# Comment out or remove OLLAMA_URL
# OLLAMA_URL="http://localhost:11434"
# AI_MOCK is NOT set
# In production: AI features will be disabled
# In development: mock provider will be used as fallback
```

## Running Tests

### Unit tests (no Ollama needed):
```bash
npx tsx test-ai-provider.ts
```

### Real Ollama E2E test (requires Ollama running + model):
```bash
# Make sure Ollama is running with the model
ollama list  # Should show qwen2.5:3b

# Make sure Fontaine dev server is running
npm run dev

# Run the full E2E test
npx tsx test-e2e-ollama.ts
```

### Existing Phase 4 E2E test:
```bash
npx tsx test-e2e.ts
```

## Troubleshooting

### "Ollama configured but not available"
- Check Ollama is running: `curl http://localhost:11434/`
- Check model is installed: `ollama list`
- Pull the model if missing: `ollama pull qwen2.5:3b`

### "Model not found" error
- The configured model isn't installed: `ollama pull <model-name>`
- Check `OLLAMA_MODEL` in `.env` matches an installed model

### Generation timeout
- First request after starting Ollama takes longer (model loading into RAM)
- Reduce `questionCount` to 2-3 for faster generation
- Use a smaller model if your hardware is limited

### Poor quality Arabic output
- Try a larger model: `qwen2.5:7b` (needs more RAM)
- Reduce question count to improve per-question quality
- The teacher can edit questions before approving

### AI features show "not connected"
- Verify `OLLAMA_URL` is set in `.env`
- Restart the Fontaine dev server after changing `.env`
- Check Ollama is running

## Performance Expectations

With `qwen2.5:3b` on a modern CPU (no GPU):

| Operation | Time |
|-----------|------|
| Quiz generation (3 questions) | 5-15s |
| True/false generation (3 questions) | 5-12s |
| Remediation activity | 5-15s |
| Teacher chat response | 3-8s |
| Mistake explanation | 2-5s |
| First request (model loading) | 15-45s |

Times decrease significantly with a GPU or larger RAM.

## Security Notes

- Ollama runs **locally only** — no data leaves your computer
- Students cannot access AI endpoints (teacher authentication required)
- AI-generated content is always created as drafts (teacher must approve)
- No API keys needed — Ollama is free and open source
- AI logs record actions but not sensitive student personal data
