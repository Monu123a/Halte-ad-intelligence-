import prisma from "@/lib/prisma";
import { GoogleAdsConnector } from "@/lib/connector/google";
import { decrypt, encrypt } from "@/lib/crypto";

const connector = new GoogleAdsConnector();

export async function runGoogleSync(connectionId: string) {
  const conn = await prisma.adConnection.findUnique({
    where: { id: connectionId }
  });

  if (!conn || !conn.accessTokenEnc) {
    throw new Error(`Connection ${connectionId} not found or missing token`);
  }

  if (!conn.isEnabled) {
    console.log(`Google account ${conn.platformAccountId} is disabled. Skipping.`);
    return;
  }

  let accessToken = decrypt(conn.accessTokenEnc);
  const now = new Date();

  // 1. Auto-refresh token if expired
  if (conn.refreshTokenEnc && conn.tokenExpiresAt && conn.tokenExpiresAt <= now) {
    try {
      const oldRefreshToken = decrypt(conn.refreshTokenEnc);
      const refreshResult = await connector.refreshToken(oldRefreshToken);
      accessToken = refreshResult.accessToken;
      
      await prisma.adConnection.update({
        where: { id: conn.id },
        data: {
          accessTokenEnc: encrypt(accessToken),
          tokenExpiresAt: refreshResult.expiresAt
        }
      });
    } catch (e: any) {
      await prisma.adConnection.update({
        where: { id: conn.id },
        data: { status: "ERROR" }
      });
      throw new Error(`Google token refresh failed: ${e.message}`);
    }
  }

  // Parse login-customer-id metadata if it was an MCC child
  let metadata: any = undefined;
  if (conn.metadata) {
    try {
      metadata = JSON.parse(conn.metadata);
    } catch {}
  }

  // 2. Fetch recent 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const rawCampaigns = await connector.fetchCampaigns(accessToken, conn.platformAccountId, metadata);
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

  // Helper for bounded parallel execution
  const pMap = async <T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 12): Promise<R[]> => {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);
      const chunkRes = await Promise.all(chunk.map(fn));
      results.push(...chunkRes);
    }
    return results;
  };

  // 4. Map & Upsert Campaigns
  await pMap(rawCampaigns, async (c) => {
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
  });

  // 5. Upsert Ad Sets
  const campMap = await prisma.campaign.findMany({ where: { adConnectionId: conn.id } });
  const campIdMap = new Map(campMap.map(c => [c.platformCampaignId, c.id]));

  await pMap(rawAdSets, async (a) => {
    const parentCampId = campIdMap.get(a.campaignId);
    if (!parentCampId) return;
    
    await prisma.adSet.upsert({
      where: { platformAdSetId: a.id },
      update: { name: a.name },
      create: {
        platformAdSetId: a.id,
        name: a.name,
        campaignId: parentCampId
      }
    });
  });

  // Ensure campaigns without traditional ad groups (like Performance Max) have a default ad set for metrics
  await pMap(campMap, async (c) => {
    const pmaxKey = `pmax_${c.platformCampaignId}`;
    await prisma.adSet.upsert({
      where: { platformAdSetId: pmaxKey },
      update: { name: `${c.name} (Asset Group)` },
      create: {
        platformAdSetId: pmaxKey,
        name: `${c.name} (Asset Group)`,
        campaignId: c.id
      }
    });
  });

  // 6. Upsert Metrics
  const asMap = await prisma.adSet.findMany({ 
    where: { campaign: { adConnectionId: conn.id } } 
  });
  const asIdMap = new Map(asMap.map(a => [a.platformAdSetId, a.id]));

  await pMap(metrics, async (m) => {
    const parentAdSetId = asIdMap.get(m.adSetId);
    if (!parentAdSetId) return;
    
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
  });

  await prisma.adConnection.update({
    where: { id: conn.id },
    data: { lastSyncedAt: new Date(), status: "CONNECTED" }
  });
  
  console.log(`[Google Sync] Completed sync for ${conn.label}`);
}
