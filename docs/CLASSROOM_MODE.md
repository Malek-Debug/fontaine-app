# Classroom Mode — Technical Reference

Fontaine supports three session modes: **Individual**, **Teacher-Led**, and **Team**. Each mode shares the same activity/question infrastructure but differs in how answers are collected and scored.

## Session Modes

| Mode | Value | Student Devices | Answer Model | Scoring |
|------|-------|----------------|--------------|---------|
| Individual | `individual` | 1 per student | Each student answers independently | Per-student via `StudentAnswer` |
| Teacher-Led | `teacher_led` | 0 (projector only) | Teacher submits one class answer | Per-session via `ClassResponse` |
| Team | `team` | 1 per group | Students answer individually, scores aggregate | Per-student + team aggregation |

## Database Schema Changes

### Modified Models

**GameSession** — two new fields:
- `mode String @default("individual")` — one of `individual`, `teacher_led`, `team`
- `showLeaderboard Boolean @default(true)` — controls whether leaderboard is shown in results

**SessionParticipant** — one new field:
- `teamId String?` — optional FK to `Team`, used in team mode

### New Models

**Team**
```prisma
model Team {
  id           String   @id @default(cuid())
  sessionId    String
  name         String
  color        String
  score        Int      @default(0)
  orderIndex   Int      @default(0)
  session      GameSession @relation(fields: [sessionId], references: [id])
  participants SessionParticipant[]
  @@unique([sessionId, name])
}
```

**ClassResponse** — stores class-level answers for teacher-led mode:
```prisma
model ClassResponse {
  id         String   @id @default(cuid())
  sessionId  String
  questionId String
  answer     String
  isCorrect  Boolean
  score      Int      @default(0)
  answeredAt DateTime @default(now())
  session    GameSession @relation(fields: [sessionId], references: [id])
  question   Question    @relation(fields: [questionId], references: [id])
  @@unique([sessionId, questionId])
}
```

### Migration

File: `prisma/migrations/20260928_add_classroom_modes/migration.sql`

Applied via `npx prisma db push`.

## API Routes

### Existing (modified)

| Route | Changes |
|-------|---------|
| `POST /api/sessions` | Accepts `mode`, `showLeaderboard`, `teamCount`, `teamNames`. Auto-creates teams when `mode=team`. |
| `GET /api/sessions` | Includes `teams` in response. |
| `GET /api/sessions/[code]` | Includes `mode` and `teams` in response. |
| `GET /api/sessions/results/[sessionId]` | Mode-aware: returns `classResults` for teacher-led, `teamLeaderboard` for team. |

### New

**`/api/game/[sessionId]/teams`**

| Method | Description | Auth |
|--------|-------------|------|
| GET | List teams with members | Teacher (session owner) |
| POST | Create a team (max 8, team mode only) | Teacher |
| PUT | Update team name/color | Teacher |
| DELETE | Delete team (unassigns members first) | Teacher |

**`/api/game/[sessionId]/class-answer`**

| Method | Description | Auth |
|--------|-------------|------|
| POST | Submit class answer for a question (teacher-led only) | Teacher |
| GET | Get all class responses with summary stats | Teacher |

The POST endpoint auto-scores against the correct answer for all 8 game types.

## Socket.IO Events

### New Client Events (sent by client)

| Event | Payload | Description |
|-------|---------|-------------|
| `student:select-team` | `{ teamId }` | Student chooses a team in team mode |
| `teacher:prev-question` | `{ sessionId }` | Go back one question |
| `teacher:pause-session` | `{ sessionId }` | Pause the session |
| `teacher:resume-session` | `{ sessionId }` | Resume a paused session |
| `teacher:reveal-answer` | `{ sessionId }` | Reveal correct answer without advancing |
| `teacher:class-answer` | `{ sessionId, questionId, answer }` | Submit class answer (teacher-led) |
| `teacher:award-point` | `{ sessionId, questionId }` | Award a point to the class (teacher-led) |
| `teacher:remove-point` | `{ sessionId, questionId }` | Remove a point from the class (teacher-led) |

### New Server Events (sent by server)

| Event | Payload | Description |
|-------|---------|-------------|
| `team:scores` | `{ teams: [{ teamId, teamName, teamColor, totalScore }] }` | Updated team scores |
| `class:answer-result` | `{ questionId, isCorrect, score, correctAnswer }` | Result of class answer |

### Modified Events

- `session:state` — now includes `mode`, `showLeaderboard`, `teams` (with `memberCount`), `classScore`
- `session:results` — now includes `mode`, `teamLeaderboard`, `classResults`
- `student:join` — now accepts optional `teamId`

## Pages

### New: Projector Page

**Route:** `/[locale]/teacher/sessions/[sessionId]/projector`

Full-screen dark-themed page (bg-neutral-900) designed for projector/smartboard display. Features:
- Very large Arabic text (text-5xl/text-6xl) for classroom visibility
- Quiz/true_false/vocabulary: colored option buttons the teacher clicks
- Other game types: manual judge mode with correct/incorrect buttons
- Timer with red pulse at low time
- Controls: Pause/Resume, Previous, Reveal Answer, Award/Remove Point, Show Explanation, Next, End Session
- Results screen with accuracy percentage and per-question breakdown

### Modified Pages

- **Session creation dialog** (`/teacher/sessions`) — multi-step: select activity → choose mode → configure teams
- **Live page** (`/teacher/sessions/[sessionId]/live`) — mode badge, team scores, team member display, pause/resume
- **Student join** (`/join/[code]`) — team selection phase, team scores in results, team leaderboard

## Game Type Compatibility

All 8 game types work with all 3 modes:

| Game Type | Teacher-Led | Team | Individual |
|-----------|-------------|------|------------|
| quiz | Auto-score (MCQ) | Standard | Standard |
| true_false | Auto-score | Standard | Standard |
| vocabulary | Auto-score (MCQ) | Standard | Standard |
| matching | Manual judge | Standard | Standard |
| sentence_builder | Manual judge | Standard | Standard |
| order_story | Manual judge | Standard | Standard |
| grammar_detective | Manual judge | Standard | Standard |
| find_mistake | Manual judge | Standard | Standard |

"Auto-score" means the projector page shows clickable options and scores automatically. "Manual judge" means the teacher uses correct/incorrect buttons.

## i18n

New keys are in the `classroom` namespace across all 3 locale files:
- `messages/ar.json` — ~45 keys (Arabic)
- `messages/fr.json` — ~45 keys (French)
- `messages/en.json` — ~45 keys (English)

Key categories: mode names/descriptions, team management, projector controls, results labels.

Access via `useTranslations('classroom')` in components.
