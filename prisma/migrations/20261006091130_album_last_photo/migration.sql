-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "lastPhotoAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Album_lastPhotoAt_idx" ON "Album"("lastPhotoAt" DESC);

-- CreateIndex
CREATE INDEX "DiaryEntry_createdAt_idx" ON "DiaryEntry"("createdAt" DESC);
