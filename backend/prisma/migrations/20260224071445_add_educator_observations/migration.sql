-- AlterTable
ALTER TABLE "screening_sessions" ADD COLUMN     "assessmentTemplate" JSONB;

-- AlterTable
ALTER TABLE "tier_allocations" ADD COLUMN     "educatorObservations" TEXT,
ADD COLUMN     "observationSuggestions" JSONB;

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "partLabel" TEXT,
    "questionIdx" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 1,
    "passageText" TEXT,
    "instructions" TEXT,
    "correctAnswer" TEXT,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_quiz_responses" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_quiz_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_questions_sessionId_idx" ON "assessment_questions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "student_quiz_responses_studentId_questionId_key" ON "student_quiz_responses"("studentId", "questionId");

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "screening_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_quiz_responses" ADD CONSTRAINT "student_quiz_responses_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "screening_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_quiz_responses" ADD CONSTRAINT "student_quiz_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "assessment_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
