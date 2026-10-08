import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import prisma from "../prisma";
import { MetaAdsConnector } from "../connector/meta";
import { decrypt } from "../crypto";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const connector = new MetaAdsConnector();

export const syncWorker = new Worker(
  "meta-sync-queue",
  async (job: Job) => {
    const { connectionId } = job.data;
    
    const metaConn = await prisma.adConnection.findUnique({
      where: { id: connectionId }
    });

    if (!metaConn || !metaConn.accessTokenEnc) {
      throw new Error(`Connection ${connectionId} not found or missing token`);
    }

    if (!metaConn.isEnabled) {
      console.log(`Account ${metaConn.platformAccountId} is disabled. Skipping sync.`);
      return;
    }

    const log = await prisma.syncLog.create({
      data: { status: "running" }
    });

    try {
      const token = decrypt(metaConn.accessTokenEnc);
      const adAccountId = metaConn.platformAccountId;
      
      const campaigns = await connector.fetchCampaigns(token, adAccountId);
      const adSets = await connector.fetchAdSets(token, adAccountId);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12); 
      
      const metrics = await connector.fetchDailyMetrics(token, adAccountId, { start: startDate, end: endDate });

      const unmatchedCampaigns: string[] = [];
      const allBrands = await prisma.brand.findMany();

      // Helper to map regions from an adset
      const getRegionFromAdSets = (campId: string) => {
        const campAdSets = adSets.filter(a => a.campaignId === campId);
        for (const adset of campAdSets) {
          const regions = adset.rawResponse?.targeting?.geo_locations?.regions;
          if (regions && regions.length > 0) {
            // Very simple region mapping
            const stateNames = regions.map((r: any) => r.name.toLowerCase());
            if (stateNames.some((n: string) => n.includes("maharashtra") || n.includes("gujarat"))) return "West region";
            if (stateNames.some((n: string) => n.includes("karnataka") || n.includes("tamil nadu") || n.includes("kerala"))) return "South region";
            if (stateNames.some((n: string) => n.includes("west bengal") || n.includes("assam"))) return "East region";
            if (stateNames.some((n: string) => n.includes("punjab") || n.includes("haryana") || n.includes("jammu"))) return "North region";
          }
        }
        return "All India";
      };

      for (const camp of campaigns) {
        let brandPageId: string | null = null;
        let products: string[] = [];
        
        // 1. Try mapping Gardena/Gorilla by Page ID
        if (camp.pageId) {
          const brand = allBrands.find(b => b.pageId === camp.pageId);
          if (brand) {
            brandPageId = brand.pageId;
          }
        }
        
        const cleanName = camp.name.replace(/^Instagram post:\s*/i, '').replace(/^Instagram पोस्ट:\s*/i, '');

        // 2. Map BKR/Velcro by keywords
        if (!brandPageId) {
          const lowerName = cleanName.toLowerCase();
          if (lowerName.includes("bkr")) {
            const b = allBrands.find(b => b.name.toLowerCase() === "bkr");
            if (b) brandPageId = b.pageId;
          } else if (lowerName.includes("velcro")) {
            const b = allBrands.find(b => b.name.toLowerCase() === "velcro");
            if (b) brandPageId = b.pageId;
          }
        }

        // 3. Product mapping
        const lowerName = cleanName.toLowerCase();
        if (lowerName.includes("fogging") || lowerName.includes("fogger")) products.push("Fogging Machine");
        if (lowerName.includes("chainsaw") || lowerName.includes("chain saw")) products.push("Chainsaw");
        if (lowerName.includes("sprinkler")) products.push("Sprinklers");
        if (lowerName.includes("hose reel") || lowerName.includes("hose")) products.push("Hose Reels");
        if (lowerName.includes("snow chain")) products.push("Snow Chains");
        if (lowerName.includes("mounting tape") || lowerName.includes("tape")) products.push("Mounting Tape");
        if (lowerName.includes("cord organiser")) products.push("Cord Organiser");
        // ... can be expanded
        
        if (!brandPageId) {
          unmatchedCampaigns.push(camp.id);
        }

        const region = getRegionFromAdSets(camp.id);

        await prisma.campaign.upsert({
          where: { platformCampaignId: camp.id },
          create: {
            platformCampaignId: camp.id,
            name: cleanName,
            objective: camp.objective || "UNKNOWN",
            format: "Unknown", 
            pageId: camp.pageId,
            brandPageId,
            products,
            region,
            adConnectionId: metaConn.id
          },
          update: {
            name: cleanName,
            objective: camp.objective || "UNKNOWN",
            pageId: camp.pageId,
            brandPageId,
            products,
            region
          }
        });
      }

      for (const adSet of adSets) {
        const camp = await prisma.campaign.findUnique({ where: { platformCampaignId: adSet.campaignId } });
        if (camp) {
          await prisma.adSet.upsert({
            where: { platformAdSetId: adSet.id },
            create: {
              platformAdSetId: adSet.id,
              name: adSet.name,
              campaignId: camp.id,
              optimizationGoal: adSet.rawResponse?.optimization_goal,
              destinationType: adSet.rawResponse?.destination_type,
            },
            update: { 
              name: adSet.name,
              optimizationGoal: adSet.rawResponse?.optimization_goal,
              destinationType: adSet.rawResponse?.destination_type,
            }
          });
        }
      }

      for (const metric of metrics) {
        const adSet = await prisma.adSet.findUnique({ where: { platformAdSetId: metric.adSetId } });
        if (adSet) {
          await prisma.dailyMetric.upsert({
            where: {
              adSetId_date: {
                adSetId: adSet.id,
                date: metric.date,
              }
            },
            create: {
              adSetId: adSet.id,
              date: metric.date,
              spend: metric.spend,
              impressions: metric.impressions,
              clicks: metric.clicks,
              rawResponse: metric.rawResponse,
            },
            update: {
              spend: metric.spend,
              impressions: metric.impressions,
              clicks: metric.clicks,
              rawResponse: metric.rawResponse,
            }
          });
        }
      }

      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: "success",
          finishedAt: new Date(),
          unmatchedCampaigns: JSON.stringify(unmatchedCampaigns)
        }
      });
      
      await prisma.adConnection.update({
        where: { id: metaConn.id },
        data: { lastSyncedAt: new Date(), status: "CONNECTED" }
      });

    } catch (error: any) {
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: "error",
          errorMsg: error.message,
          finishedAt: new Date()
        }
      });
      
      await prisma.adConnection.update({
        where: { id: metaConn.id },
        data: { status: "ERROR" }
      });
      throw error;
    }
  },
  { connection }
);
