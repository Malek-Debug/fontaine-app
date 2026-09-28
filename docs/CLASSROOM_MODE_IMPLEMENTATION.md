# Classroom Mode — Implementation Summary

## Overview

Added three session modes (individual, teacher_led, team) to the existing Fontaine game system. The implementation extends the existing architecture without rewriting or duplicating core systems.

## Files Changed

### Database
- `prisma/schema.prisma` — Added Team, ClassResponse models; mode/showLeaderboard on GameSession; teamId on SessionParticipant
- `prisma/migrations/20260928_add_classroom_modes/migration.sql` — ALTER TABLE + CREATE TABLE statements

### API Routes (modified)
- `src/app/api/sessions/route.ts` — POST accepts mode/teamCount/teamNames, auto-creates teams; GET includes teams
- `src/app/api/sessions/[code]/route.ts` — Includes mode and teams in response
- `src/app/api/sessions/results/[sessionId]/route.ts` — Mode-aware results: classResults for teacher-led, teamLeaderboard for team

### API Routes (new)
- `src/app/api/game/[sessionId]/teams/route.ts` — Team CRUD (GET/POST/PUT/DELETE)
- `src/app/api/game/[sessionId]/class-answer/route.ts` — Class answer submission and retrieval

### Socket.IO
- `src/lib/socket/events.ts` — New payloads and event types for teams, class answers, session control
- `src/lib/socket/handlers.ts` — Handlers for team selection, prev-question, pause/resume, reveal, class-answer, award/remove point; mode-aware session state and results emission

### UI Pages (modified)
- `src/app/[locale]/teacher/sessions/page.tsx` — Multi-step session creation dialog with mode selector
- `src/app/[locale]/teacher/sessions/[sessionId]/live/page.tsx` — Mode badge, team scores, pause/resume
- `src/app/[locale]/join/[code]/page.tsx` — Team selection phase, team results display

### UI Pages (new)
- `src/app/[locale]/teacher/sessions/[sessionId]/projector/page.tsx` — Full-screen projector view for teacher-led mode

### Validators
- `src/lib/validators.ts` — createSessionSchema extended with mode, showLeaderboard, teamCount, teamNames

### i18n
- `messages/ar.json` — ~45 new keys in `classroom` namespace
- `messages/fr.json` — ~45 new keys in `classroom` namespace
- `messages/en.json` — ~45 new keys in `classroom` namespace

### Tests
- `test-classroom-modes.ts` — Dedicated test suite for all 3 modes

## Migration

Single migration adding:
1. `mode` and `showLeaderboard` columns to `GameSession`
2. `Team` table with unique constraint on `(sessionId, name)`
3. `ClassResponse` table with unique constraint on `(sessionId, questionId)`
4. `teamId` column on `SessionParticipant` with FK to `Team`

All new columns have defaults, so existing data is unaffected.

## Test Coverage

| Suite | Result |
|-------|--------|
| Full System Test (`test-full-system.ts`) | 156/156 passed |
| Classroom Modes Test (`test-classroom-modes.ts`) | 78/78 passed |
| E2E Test (`test-e2e.ts`) | Steps 1–9 pass; Step 10 (Ollama AI generation) flaky — pre-existing, unrelated to classroom modes |

### Classroom Modes Test Breakdown
- **A: Teacher-Led Mode** — Session creation, class answer submission, answer retrieval, results with classResults
- **B: Team Mode** — Session with auto-created teams, team CRUD, student-team assignment, team leaderboard in results
- **C: Individual Mode (Regression)** — Default mode unchanged, explicit mode works, session lookup includes mode
- **D: Security** — Auth required for class-answer and teams APIs; mode enforcement (class-answer rejects non-teacher-led, team creation rejects non-team)
- **E: Session Lookup** — Mode and teams present in session-by-code lookup
- **F: All 8 Game Types** — Every game type creates successfully with teacher-led and team modes (16 sessions tested)
- **G: Page Rendering** — Projector, live, and join pages all load (HTTP 200)

## Architecture Decisions

**ClassResponse vs StudentAnswer:** Teacher-led mode uses a separate `ClassResponse` model instead of creating fake `StudentAnswer` records. This prevents data contamination — there are no phantom individual student results for sessions where students didn't answer individually.

**Team score aggregation:** Team scores are computed by summing `SessionParticipant.totalScore` for all team members, not maintained as a separate counter. The `Team.score` field is updated on session end for final results but real-time team scores come from participant aggregation.

**ActivityRenderer reuse:** Individual and team modes use the existing `ActivityRenderer` component unchanged. The projector page has its own large-format rendering because it serves a fundamentally different purpose (classroom display, not handheld interaction).

**API route placement:** New routes are under `/api/game/[sessionId]/` instead of `/api/sessions/[sessionId]/` to avoid a Next.js dynamic route slug conflict (`[code]` vs `[sessionId]` at the same path level).

**Mode enforcement:** Server-side validation ensures class answers can only be submitted for teacher-led sessions and teams can only be created for team sessions. The socket handlers also enforce mode constraints.

## Known Limitations

1. **No real-time projector via Socket.IO:** The projector page uses SWR polling rather than socket events for state. Teacher actions (click answer, next question) trigger API calls; the projector view refreshes on response. This is adequate for classroom pace but could be migrated to sockets for lower latency.

2. **QR code uses external API:** QR codes are generated via `api.qrserver.com` to avoid adding npm dependencies. Requires internet access.

3. **No team reassignment mid-game:** Students pick their team before the game starts. Once the game is active, team membership is locked.

4. **Ollama E2E test flaky:** The AI generation test (step 10 in test-e2e.ts) occasionally fails when Ollama returns an invalid response structure. This is a pre-existing issue unrelated to classroom modes.
