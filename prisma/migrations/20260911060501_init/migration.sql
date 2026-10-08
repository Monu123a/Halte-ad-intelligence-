-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANALYST');

-- CreateEnum
CREATE TYPE "ConnStatus" AS ENUM ('CONNECTED', 'PENDING', 'ERROR');

-- CreateEnum
CREATE TYPE "LeadTag" AS ENUM ('UNTAGGED', 'SPAM', 'INFO_ONLY', 'GENUINE', 'CONVERTED');

-- CreateEnum
CREATE TYPE "RecAction" AS ENUM ('INCREASE', 'DECREASE', 'HOLD', 'HOLD_SEASONAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorToken" TEXT NOT NULL,
    "isSeasonal" BOOLEAN NOT NULL DEFAULT false,
    "pageId" TEXT NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaConnection" (
    "id" TEXT NOT NULL,
    "metaAdAccountId" TEXT NOT NULL,
    "label" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" "ConnStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "metaConnectionId" TEXT NOT NULL,
    "brandId" TEXT,
    "metaCampaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pageId" TEXT,
    "objective" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "region" TEXT,
    "product" TEXT,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSet" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "metaAdSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AdSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "adSetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "spend" DECIMAL(65,30) NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "rawResponse" JSONB NOT NULL,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "adSetId" TEXT,
    "contactRef" TEXT NOT NULL,
    "messageText" TEXT,
    "tag" "LeadTag" NOT NULL DEFAULT 'UNTAGGED',
    "taggedBy" TEXT,
    "taggedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "adSetId" TEXT NOT NULL,
    "cycleDate" TIMESTAMP(3) NOT NULL,
    "costPerGenuine" DECIMAL(65,30) NOT NULL,
    "costPerSale" DECIMAL(65,30),
    "action" "RecAction" NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "errorMsg" TEXT,
    "unmatchedCampaigns" JSONB,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalRule" (
    "id" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "validRegions" TEXT[],
    "validMonths" INTEGER[],

    CONSTRAINT "SeasonalRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_pageId_key" ON "Brand"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaConnection_metaAdAccountId_key" ON "MetaConnection"("metaAdAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_metaCampaignId_key" ON "Campaign"("metaCampaignId");

-- CreateIndex
CREATE UNIQUE INDEX "AdSet_metaAdSetId_key" ON "AdSet"("metaAdSetId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_adSetId_date_key" ON "DailyMetric"("adSetId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonalRule_product_key" ON "SeasonalRule"("product");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_metaConnectionId_fkey" FOREIGN KEY ("metaConnectionId") REFERENCES "MetaConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("pageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSet" ADD CONSTRAINT "AdSet_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "AdSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "AdSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
