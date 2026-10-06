-- CreateTable
CREATE TABLE "SpacePresence" (
    "hostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpacePresence_pkey" PRIMARY KEY ("hostId","userId")
);

-- CreateIndex
CREATE INDEX "SpacePresence_hostId_lastSeenAt_idx" ON "SpacePresence"("hostId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "SpacePresence" ADD CONSTRAINT "SpacePresence_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpacePresence" ADD CONSTRAINT "SpacePresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
