import prisma from "@/lib/prisma";
import { MetaAdsConnector } from "@/lib/connector/meta";
import { decrypt, encrypt } from "@/lib/crypto";

const connector = new MetaAdsConnector();

export async function runMetaSync(connectionId: string) {
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
    let token = decrypt(metaConn.accessTokenEnc);
    const adAccountId = metaConn.platformAccountId;

    // Proactively extend the 60-day long-lived token if within 20 days of expiring
    if (metaConn.tokenExpiresAt) {
      const daysUntilExpiry = (new Date(metaConn.tokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry < 20) {
        try {
          const refreshed = await connector.refreshToken(token);
          token = refreshed.accessToken;
          await prisma.adConnection.update({
            where: { id: metaConn.id },
            data: {
              accessTokenEnc: encrypt(refreshed.accessToken),
              tokenExpiresAt: refreshed.expiresAt
            }
          });
          console.log(`[Meta Sync] Successfully renewed 60-day token for ${metaConn.label || metaConn.platformAccountId}`);
        } catch (refreshErr) {
          console.warn(`[Meta Sync] Proactive token renewal note:`, refreshErr);
        }
      }
    }
    
    const campaigns = await connector.fetchCampaigns(token, adAccountId);
    const adSets = await connector.fetchAdSets(token, adAccountId);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); 
    
    const metrics = await connector.fetchDailyMetrics(token, adAccountId, { start: startDate, end: endDate });

    const unmatchedCampaigns: string[] = [];
    const allBrands = await prisma.brand.findMany();

    const getRegionFromAdSets = (campId: string) => {
      const campAdSets = adSets.filter(a => a.campaignId === campId);
      for (const adset of campAdSets) {
        const regions = adset.rawResponse?.targeting?.geo_locations?.regions;
        if (regions && regions.length > 0) {
          const stateNames = regions.map((r: any) => r.name.toLowerCase());
          if (stateNames.some((n: string) => n.includes("maharashtra") || n.includes("gujarat"))) return "West region";
          if (stateNames.some((n: string) => n.includes("karnataka") || n.includes("tamil nadu") || n.includes("kerala"))) return "South region";
          if (stateNames.some((n: string) => n.includes("delhi") || n.includes("punjab") || n.includes("haryana"))) return "North region";
          if (stateNames.some((n: string) => n.includes("west bengal") || n.includes("bihar") || n.includes("odisha"))) return "East region";
        }
      }
      return "All India";
    };

    const salesProds = await prisma.salesHistory.findMany({
      select: { subCategory: true, brand: true },
      distinct: ['subCategory', 'brand'],
      where: { subCategory: { not: null }, brand: { not: null } }
    });

    for (const camp of campaigns) {
      let brandPageId: string | null = null;
      let products: string[] = [];
      
      const cleanName = camp.name.replace(/^Instagram post:\s*/i, '').replace(/^Instagram पोस्ट:\s*/i, '');
      const campAdSets = adSets.filter(a => a.campaignId === camp.id).map(a => a.name);
      const adNames = camp.adNames || [];
      const fullText = [cleanName, ...campAdSets, ...adNames].join(" ").toLowerCase();

      const foundBrands = new Set<string>();
      if (camp.pageId) {
        const directBrand = allBrands.find(b => b.pageId === camp.pageId);
        if (directBrand) foundBrands.add(directBrand.name);
      }

      for (const b of allBrands) {
        const bName = b.name.toLowerCase();
        const regex = new RegExp(`(^|[^a-z0-9])${bName}([^a-z0-9]|$)`, 'i');
        if (regex.test(fullText)) {
          foundBrands.add(b.name);
        }
      }

      for (const sp of salesProds) {
        const sub = sp.subCategory!.toLowerCase();
        if (sub.length > 2 && fullText.includes(sub)) {
          products.push(sp.subCategory!);
          if (sp.brand) foundBrands.add(sp.brand);
        }
      }

      products = Array.from(new Set(products));

      if (foundBrands.size === 1) {
        const bName = Array.from(foundBrands)[0];
        const match = allBrands.find(b => b.name === bName);
        if (match) brandPageId = match.pageId;
      } else if (foundBrands.size > 1) {
        for (const bName of Array.from(foundBrands)) {
          const directMatch = allBrands.find(b => b.name === bName);
          if (directMatch && directMatch.pageId === camp.pageId) {
            brandPageId = directMatch.pageId;
            break;
          }
        }
        if (!brandPageId) {
          const firstB = Array.from(foundBrands)[0];
          const match = allBrands.find(b => b.name === firstB);
          if (match) brandPageId = match.pageId;
        }
      }

      if (!brandPageId) {
        unmatchedCampaigns.push(camp.id);
      }

      let detectedFormat = "Unknown";
      if (fullText.includes("reel")) detectedFormat = "Reel";
      else if (fullText.includes("carousel")) detectedFormat = "Carousel";
      else if (fullText.includes("static") || fullText.includes("image")) detectedFormat = "Static";

      const detectedRegion = getRegionFromAdSets(camp.id);

      await prisma.campaign.upsert({
        where: { platformCampaignId: camp.id },
        update: {
          name: camp.name,
          pageId: camp.pageId || null,
          brandPageId: brandPageId,
          objective: camp.objective,
          format: detectedFormat,
          region: detectedRegion,
          products: products
        },
        create: {
          adConnectionId: metaConn.id,
          platformCampaignId: camp.id,
          name: camp.name,
          pageId: camp.pageId || null,
          brandPageId: brandPageId,
          objective: camp.objective,
          format: detectedFormat,
          region: detectedRegion,
          products: products
        }
      });
    }

    const dbCampaigns = await prisma.campaign.findMany({
      where: { adConnectionId: metaConn.id },
      select: { id: true, platformCampaignId: true }
    });
    const campaignMap = new Map(dbCampaigns.map(c => [c.platformCampaignId, c.id]));

    for (const adset of adSets) {
      const campDbId = campaignMap.get(adset.campaignId);
      if (!campDbId) continue;

      await prisma.adSet.upsert({
        where: { platformAdSetId: adset.id },
        update: {
          name: adset.name,
          campaignId: campDbId
        },
        create: {
          platformAdSetId: adset.id,
          name: adset.name,
          campaignId: campDbId
        }
      });
    }

    const dbAdSets = await prisma.adSet.findMany({
      where: { campaign: { adConnectionId: metaConn.id } },
      select: { id: true, platformAdSetId: true }
    });
    const adSetMap = new Map(dbAdSets.map(a => [a.platformAdSetId, a.id]));

    for (const metric of metrics) {
      const adSetDbId = adSetMap.get(metric.adSetId);
      if (!adSetDbId) continue;

      await prisma.dailyMetric.upsert({
        where: {
          adSetId_date: {
            adSetId: adSetDbId,
            date: metric.date
          }
        },
        update: {
          spend: metric.spend,
          impressions: metric.impressions,
          clicks: metric.clicks,
          rawResponse: metric.rawResponse || {}
        },
        create: {
          adSetId: adSetDbId,
          date: metric.date,
          spend: metric.spend,
          impressions: metric.impressions,
          clicks: metric.clicks,
          rawResponse: metric.rawResponse || {}
        }
      });
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

    console.log(`[Meta Sync] Completed sync for ${metaConn.label || metaConn.platformAccountId}`);

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
}
