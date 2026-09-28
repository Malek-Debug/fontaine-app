-- Add classroom mode fields to GameSession
ALTER TABLE "GameSession" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE "GameSession" ADD COLUMN "showLeaderboard" BOOLEAN NOT NULL DEFAULT true;

-- Create Team table
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "score" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add teamId to SessionParticipant
ALTER TABLE "SessionParticipant" ADD COLUMN "teamId" TEXT REFERENCES "Team"("id");

-- Create ClassResponse table for teacher-led mode
CREATE TABLE "ClassResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX "Team_sessionId_name_key" ON "Team"("sessionId", "name");
CREATE UNIQUE INDEX "ClassResponse_sessionId_questionId_key" ON "ClassResponse"("sessionId", "questionId");
