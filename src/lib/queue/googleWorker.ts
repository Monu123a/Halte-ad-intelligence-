import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import prisma from "../prisma";
import { GoogleAdsConnector } from "../connector/google";
import { decrypt, encrypt } from "../crypto";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const googleWorker = new Worker(
  "google-sync-queue",
  async (job: Job) => {
    const { connectionId } = job.data;
    
    const conn = await prisma.adConnection.findUnique({
      where: { id: connectionId }
    });
    
    if (!conn) throw new Error("Connection not found");
    if (!conn.refreshTokenEnc) throw new Error("Google connection missing refresh token");

    const connector = new GoogleAdsConnector();
    
    // 1. Always refresh the access token before syncing
    const refreshToken = decrypt(conn.refreshTokenEnc);
    let accessToken: string;
    try {
      const refreshed = await connector.refreshToken(refreshToken);
      accessToken = refreshed.accessToken;
      
      await prisma.adConnection.update({
        where: { id: conn.id },
        data: {
          accessTokenEnc: encrypt(accessToken),
          tokenExpiresAt: refreshed.expiresAt
        }
      });
    } catch (e: any) {
      await prisma.adConnection.update({
        where: { id: conn.id },
        data: { status: "ERROR" }
      });
      throw new Error(`Failed to refresh Google token: ${e.message}`);
    }

    const metadata = conn.metadata ? JSON.parse(conn.metadata) : {};

    // 2. Fetch 12 Months Data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    console.log(`[Google Worker] Fetching data for ${conn.label || conn.platformAccountId}...`);

    let rawCampaigns = [];
    try {
      rawCampaigns = await connector.fetchCampaigns(accessToken, conn.platformAccountId, metadata);
    } catch (e: any) {
      if (e.message.includes("revoked") || e.message.includes("invalid_grant")) {
        await prisma.adConnection.update({ where: { id: conn.id }, data: { status: "ERROR" } });
      }
      throw e;
    }

    const rawAdSets = await connector.fetchAdSets(accessToken, conn.platformAccountId, metadata);
    const metrics = await connector.fetchDailyMetrics(accessToken, conn.platformAccountId, { start: startDate, end: endDate }, metadata);

    // 3. Prepare Brand Mapping Lookups
    const brands = await prisma.brand.findMany();
    const history = await prisma.salesHistory.findMany({
      select: { brand: true, subCategory: true }
    });
    
    const productToBrandMap = new Map<string, string>();
    history.forEach(h => {
      if (h.subCategory && h.brand) productToBrandMap.set(h.subCategory.toLowerCase(), h.brand);
    });

    // 4. Map & Upsert Campaigns
    for (const c of rawCampaigns) {
      // Very basic Google mapping for now until user clarifies naming convention
      // Combine campaign name to check for subcategory products
      const searchString = c.name.toLowerCase();
      let detectedBrand: string | null = null;
      const matchedProducts = new Set<string>();

      for (const [product, brandName] of Array.from(productToBrandMap.entries())) {
        if (searchString.includes(product)) {
          detectedBrand = brandName;
          matchedProducts.add(product);
        }
      }

      for (const b of brands) {
        if (searchString.includes(b.name.toLowerCase())) {
          detectedBrand = b.name;
        }
      }
      
      const brandObj = detectedBrand ? brands.find(b => b.name === detectedBrand) : null;
      
      await prisma.campaign.upsert({
        where: { platformCampaignId: c.id },
        update: {
          name: c.name,
          objective: c.objective,
          brandPageId: brandObj?.pageId,
          products: Array.from(matchedProducts)
        },
        create: {
          platformCampaignId: c.id,
          name: c.name,
          objective: c.objective,
          format: "Search",
          adConnectionId: conn.id,
          brandPageId: brandObj?.pageId,
          products: Array.from(matchedProducts)
        }
      });
    }

    // 5. Upsert Ad Sets
    const campMap = await prisma.campaign.findMany({ where: { adConnectionId: conn.id } });
    const campIdMap = new Map(campMap.map(c => [c.platformCampaignId, c.id]));

    for (const a of rawAdSets) {
      const parentCampId = campIdMap.get(a.campaignId);
      if (!parentCampId) continue; // Skip orphaned
      
      await prisma.adSet.upsert({
        where: { platformAdSetId: a.id },
        update: { name: a.name },
        create: {
          platformAdSetId: a.id,
          name: a.name,
          campaignId: parentCampId
        }
      });
    }

    // 6. Upsert Metrics
    const asMap = await prisma.adSet.findMany({ 
      where: { campaign: { adConnectionId: conn.id } } 
    });
    const asIdMap = new Map(asMap.map(a => [a.platformAdSetId, a.id]));

    for (const m of metrics) {
      const parentAdSetId = asIdMap.get(m.adSetId);
      if (!parentAdSetId) continue;
      
      await prisma.dailyMetric.upsert({
        where: {
          adSetId_date: {
            adSetId: parentAdSetId,
            date: m.date
          }
        },
        update: {
          spend: m.spend,
          impressions: m.impressions,
          clicks: m.clicks,
          rawResponse: m.rawResponse || {}
        },
        create: {
          adSetId: parentAdSetId,
          date: m.date,
          spend: m.spend,
          impressions: m.impressions,
          clicks: m.clicks,
          rawResponse: m.rawResponse || {}
        }
      });
    }

    await prisma.adConnection.update({
      where: { id: conn.id },
      data: { lastSyncedAt: new Date(), status: "CONNECTED" }
    });
    
    console.log(`[Google Worker] Completed sync for ${conn.label}`);
  },
  { connection }
);
