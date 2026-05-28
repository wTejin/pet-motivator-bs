-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "school" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trialUntil" BIGINT NOT NULL,
    "authorizedUntil" BIGINT NOT NULL,
    "playerMode" TEXT NOT NULL DEFAULT 'display',
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '😊',
    "currentPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'egg',
    "carePoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "hunger" INTEGER NOT NULL DEFAULT 100,
    "mood" INTEGER NOT NULL DEFAULT 100,
    "currentSkin" TEXT NOT NULL DEFAULT 'default',
    "equippedDecorations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastDecayAt" BIGINT NOT NULL,
    "lastFedAt" BIGINT NOT NULL,
    "lastPlayedAt" BIGINT NOT NULL DEFAULT 0,
    "createdAt" BIGINT NOT NULL,
    "evolvedAt" BIGINT NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreDimension" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '⭐',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ScoreDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreIndicator" (
    "id" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" TEXT NOT NULL DEFAULT '',
    "defaultPoints" INTEGER NOT NULL DEFAULT 5,
    "dailyLimit" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScoreIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreRecord" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "ruleId" TEXT,
    "indicatorId" TEXT,
    "sessionId" TEXT,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "operatorType" TEXT NOT NULL DEFAULT 'coach',
    "operatorId" TEXT NOT NULL DEFAULT 'system',
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "ScoreRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusRule" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "criteria" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BonusRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "coachId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "effect" JSONB NOT NULL,
    "imageClass" TEXT NOT NULL DEFAULT '',
    "stock" INTEGER NOT NULL DEFAULT 999,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerInventory" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" BIGINT NOT NULL,

    CONSTRAINT "PlayerInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetSpeciesDef" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "emoji" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "stages" JSONB NOT NULL,

    CONSTRAINT "PetSpeciesDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessoryDef" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "imageUrl" TEXT,
    "position" JSONB NOT NULL,

    CONSTRAINT "AccessoryDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetBackgroundDef" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cssGradient" TEXT NOT NULL,
    "imageUrl" TEXT,
    "thumbnailColor" TEXT NOT NULL,

    CONSTRAINT "PetBackgroundDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomData" (
    "id" TEXT NOT NULL,
    "coachId" TEXT,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "importedAt" BIGINT NOT NULL,

    CONSTRAINT "CustomData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_phone_key" ON "Coach"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Pet_playerId_key" ON "Pet"("playerId");

-- CreateIndex
CREATE INDEX "ScoreRecord_playerId_createdAt_idx" ON "ScoreRecord"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerInventory_playerId_itemId_idx" ON "PlayerInventory"("playerId", "itemId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreDimension" ADD CONSTRAINT "ScoreDimension_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreIndicator" ADD CONSTRAINT "ScoreIndicator_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "ScoreDimension"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRecord" ADD CONSTRAINT "ScoreRecord_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRecord" ADD CONSTRAINT "ScoreRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusRule" ADD CONSTRAINT "BonusRule_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopItem" ADD CONSTRAINT "ShopItem_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerInventory" ADD CONSTRAINT "PlayerInventory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
