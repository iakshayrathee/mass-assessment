-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SPECIAL_EDUCATOR', 'SCHOOL_VIEWER', 'CENTER_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'REPORT_READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TierLevel" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('PENDING', 'TRANSFERRED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educator_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,

    CONSTRAINT "educator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_viewer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "school_viewer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_admin_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,

    CONSTRAINT "center_admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_sessions" (
    "id" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "className" TEXT,
    "assessmentDate" TIMESTAMP(3) NOT NULL,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "aiStatus" "AiStatus" NOT NULL DEFAULT 'PENDING',
    "classNarrative" TEXT,
    "priorityActions" JSONB,
    "schoolSummary" TEXT,
    "anomalySummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screening_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_students" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "age" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "schoolName" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "studentRef" TEXT NOT NULL,
    "motherTongue" TEXT,
    "healthNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_scores" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "readingRaw" INTEGER NOT NULL,
    "readingMax" INTEGER NOT NULL,
    "readingPct" DOUBLE PRECISION NOT NULL,
    "readingCompRaw" INTEGER NOT NULL,
    "readingCompMax" INTEGER NOT NULL,
    "readingCompPct" DOUBLE PRECISION NOT NULL,
    "spellingRaw" INTEGER NOT NULL,
    "spellingMax" INTEGER NOT NULL,
    "spellingPct" DOUBLE PRECISION NOT NULL,
    "numeracyRaw" INTEGER NOT NULL,
    "numeracyMax" INTEGER NOT NULL,
    "numeracyPct" DOUBLE PRECISION NOT NULL,
    "writingRaw" INTEGER NOT NULL,
    "writingMax" INTEGER NOT NULL,
    "writingPct" DOUBLE PRECISION NOT NULL,
    "weightedAverage" DOUBLE PRECISION NOT NULL,
    "attentionFlag" BOOLEAN NOT NULL DEFAULT false,
    "behaviouralFlag" BOOLEAN NOT NULL DEFAULT false,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tier_allocations" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tier" "TierLevel" NOT NULL,
    "rationale" TEXT,
    "interventions" JSONB,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideTier" "TierLevel",
    "overrideReason" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "overriddenByEducator" TEXT,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tier_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_flags" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomaly_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "escalatedBy" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referralNote" TEXT,
    "priorityAreas" JSONB,
    "targetToolIntakeId" TEXT,
    "status" "EscalationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "educator_profiles_userId_key" ON "educator_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "school_viewer_profiles_userId_key" ON "school_viewer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "center_admin_profiles_userId_key" ON "center_admin_profiles"("userId");

-- CreateIndex
CREATE INDEX "screening_sessions_educatorId_idx" ON "screening_sessions"("educatorId");

-- CreateIndex
CREATE INDEX "screening_sessions_status_idx" ON "screening_sessions"("status");

-- CreateIndex
CREATE INDEX "screening_students_sessionId_idx" ON "screening_students"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "screening_scores_studentId_key" ON "screening_scores"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "tier_allocations_studentId_key" ON "tier_allocations"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "escalations_studentId_key" ON "escalations"("studentId");

-- AddForeignKey
ALTER TABLE "educator_profiles" ADD CONSTRAINT "educator_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educator_profiles" ADD CONSTRAINT "educator_profiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educator_profiles" ADD CONSTRAINT "educator_profiles_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_viewer_profiles" ADD CONSTRAINT "school_viewer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_viewer_profiles" ADD CONSTRAINT "school_viewer_profiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_admin_profiles" ADD CONSTRAINT "center_admin_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_admin_profiles" ADD CONSTRAINT "center_admin_profiles_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_sessions" ADD CONSTRAINT "screening_sessions_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "educator_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_sessions" ADD CONSTRAINT "screening_sessions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_students" ADD CONSTRAINT "screening_students_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "screening_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_scores" ADD CONSTRAINT "screening_scores_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "screening_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_allocations" ADD CONSTRAINT "tier_allocations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "screening_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_flags" ADD CONSTRAINT "anomaly_flags_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "screening_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "screening_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
