-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('ROLL', 'PARTY', 'DIRECTORS_CUT');

-- CreateEnum
CREATE TYPE "CameraMode" AS ENUM ('FILM_ROLL', 'DARKROOM', 'INSTANT');

-- CreateEnum
CREATE TYPE "WeddingStyle" AS ENUM ('DISPOSABLE', 'KODAK', 'BW', 'POLAROID', 'TLV', 'CINEMA');

-- CreateEnum
CREATE TYPE "ModerationMode" AS ENUM ('AUTO', 'APPROVE');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'SECRET');

-- CreateEnum
CREATE TYPE "FrameState" AS ENUM ('QUEUED', 'OK', 'HIDDEN', 'PENDING');

-- CreateEnum
CREATE TYPE "ReactionKind" AS ENUM ('LOVED', 'FUNNY', 'ICONIC', 'SWEET');

-- CreateEnum
CREATE TYPE "ChallengeWindow" AS ENUM ('STANDING', 'TIMED');

-- CreateEnum
CREATE TYPE "AwardKind" AS ENUM ('PHOTO_OF_NIGHT', 'FUNNIEST', 'MOST_ICONIC', 'MOST_LOVED', 'SWEETEST', 'TOP_PHOTOGRAPHER', 'BEST_DANCEFLOOR');

-- CreateTable
CREATE TABLE "Wedding" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coupleNames" TEXT NOT NULL,
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'PARTY',
    "style" "WeddingStyle" NOT NULL DEFAULT 'DISPOSABLE',
    "cameraMode" "CameraMode" NOT NULL DEFAULT 'DARKROOM',
    "exposures" INTEGER NOT NULL DEFAULT 15,
    "developDelayMinutes" INTEGER NOT NULL DEFAULT 25,
    "maxExposures" INTEGER NOT NULL DEFAULT 40,
    "rollOpensAt" TIMESTAMP(3) NOT NULL,
    "ceremonyStart" TIMESTAMP(3),
    "ceremonyEnd" TIMESTAMP(3),
    "dinnerAt" TIMESTAMP(3),
    "dancingAt" TIMESTAMP(3),
    "revealAt" TIMESTAMP(3) NOT NULL,
    "moderationMode" "ModerationMode" NOT NULL DEFAULT 'AUTO',
    "screenEnabled" BOOLEAN NOT NULL DEFAULT true,
    "leaderboard" BOOLEAN NOT NULL DEFAULT false,
    "voiceNotes" BOOLEAN NOT NULL DEFAULT true,
    "studioToken" TEXT NOT NULL,
    "modToken" TEXT NOT NULL,
    "ownerEmail" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tableNumber" INTEGER,
    "deviceToken" TEXT NOT NULL,
    "contact" TEXT,
    "exposuresTotal" INTEGER NOT NULL DEFAULT 15,
    "exposuresUsed" INTEGER NOT NULL DEFAULT 0,
    "isCouple" BOOLEAN NOT NULL DEFAULT false,
    "isPhotographer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frame" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "clientId" TEXT,
    "storageKey" TEXT NOT NULL,
    "thumbKey" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "developsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "state" "FrameState" NOT NULL DEFAULT 'QUEUED',
    "screenScore" DOUBLE PRECISION,
    "challengeId" TEXT,
    "missionId" TEXT,
    "lovedCount" INTEGER NOT NULL DEFAULT 0,
    "funnyCount" INTEGER NOT NULL DEFAULT 0,
    "iconicCount" INTEGER NOT NULL DEFAULT 0,
    "sweetCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Frame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "frameId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "kind" "ReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "pack" TEXT NOT NULL,
    "textHe" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📸',
    "window" "ChallengeWindow" NOT NULL DEFAULT 'STANDING',
    "payout" INTEGER NOT NULL DEFAULT 2,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Completion" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "frameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Completion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "promptHe" TEXT NOT NULL,
    "promptEn" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "votingClosesAt" TIMESTAMP(3) NOT NULL,
    "winnerFrameId" TEXT,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionVote" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "frameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceNote" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "audioKey" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "kind" "AwardKind" NOT NULL,
    "frameId" TEXT,
    "guestId" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "frameId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "frameId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_slug_key" ON "Wedding"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_studioToken_key" ON "Wedding"("studioToken");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_modToken_key" ON "Wedding"("modToken");

-- CreateIndex
CREATE INDEX "Wedding_revealAt_idx" ON "Wedding"("revealAt");

-- CreateIndex
CREATE INDEX "Guest_weddingId_idx" ON "Guest"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_weddingId_deviceToken_key" ON "Guest"("weddingId", "deviceToken");

-- CreateIndex
CREATE INDEX "Frame_weddingId_developsAt_idx" ON "Frame"("weddingId", "developsAt");

-- CreateIndex
CREATE INDEX "Frame_weddingId_visibility_state_idx" ON "Frame"("weddingId", "visibility", "state");

-- CreateIndex
CREATE INDEX "Frame_guestId_idx" ON "Frame"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Frame_guestId_clientId_key" ON "Frame"("guestId", "clientId");

-- CreateIndex
CREATE INDEX "Reaction_frameId_idx" ON "Reaction"("frameId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_frameId_guestId_kind_key" ON "Reaction"("frameId", "guestId", "kind");

-- CreateIndex
CREATE INDEX "Challenge_weddingId_idx" ON "Challenge"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "Completion_frameId_key" ON "Completion"("frameId");

-- CreateIndex
CREATE UNIQUE INDEX "Completion_challengeId_guestId_key" ON "Completion"("challengeId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_winnerFrameId_key" ON "Mission"("winnerFrameId");

-- CreateIndex
CREATE INDEX "Mission_weddingId_idx" ON "Mission"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionVote_missionId_guestId_key" ON "MissionVote"("missionId", "guestId");

-- CreateIndex
CREATE INDEX "VoiceNote_weddingId_idx" ON "VoiceNote"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "Award_weddingId_kind_key" ON "Award"("weddingId", "kind");

-- CreateIndex
CREATE INDEX "Tag_guestId_idx" ON "Tag"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_frameId_guestId_key" ON "Tag"("frameId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_frameId_guestId_key" ON "Report"("frameId", "guestId");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frame" ADD CONSTRAINT "Frame_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frame" ADD CONSTRAINT "Frame_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frame" ADD CONSTRAINT "Frame_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frame" ADD CONSTRAINT "Frame_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "Frame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "Frame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_winnerFrameId_fkey" FOREIGN KEY ("winnerFrameId") REFERENCES "Frame"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionVote" ADD CONSTRAINT "MissionVote_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionVote" ADD CONSTRAINT "MissionVote_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionVote" ADD CONSTRAINT "MissionVote_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "Frame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "Frame"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "Frame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "Frame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
