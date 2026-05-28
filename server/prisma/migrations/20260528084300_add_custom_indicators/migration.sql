-- CreateTable
CREATE TABLE "CustomIndicator" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultPoints" INTEGER NOT NULL DEFAULT 5,
    "dailyLimit" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomIndicator_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomIndicator" ADD CONSTRAINT "CustomIndicator_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
