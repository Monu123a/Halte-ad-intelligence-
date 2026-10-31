import prisma from "@/lib/prisma";
import { generateRecommendations, AdSetStats, SeasonalLookup, isMessagingAdSet } from "@/lib/recommendations";

// In-Memory Cache to make page switching instant
const cacheRecommendations = new Map<string, { data: any; expiresAt: number }>();
const cacheOverviewStats = new Map<string, { data: any; expiresAt: number }>();
const cacheLeads = new Map<string, { data: any; expiresAt: number }>();
let cacheSyncTimeline: { data: SyncTimelineOverview; expiresAt: number } | null = null;
const cacheAbandonedCarts = new Map<string, { data: any; expiresAt: number }>();

export function invalidateServicesCache() {
  cacheRecommendations.clear();
  cacheOverviewStats.clear();
  cacheLeads.clear();
  cacheSyncTimeline = null;
  cacheAbandonedCarts.clear();
}

export async function getLeadsData(currentTag: string = "UNTAGGED", query: string = "") {
  const cacheKey = `${currentTag}_${query.trim().toLowerCase()}`;
  const now = Date.now();
  const cached = cacheLeads.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const leads = await prisma.lead.findMany({
    where: {
      AND: [
        currentTag === "ALL" ? {} : { tag: currentTag as any },
        query ? {
          OR: [
            { contactRef: { contains: query, mode: 'insensitive' } },
            { messageText: { contains: query, mode: 'insensitive' } }
          ]
        } : {}
      ]
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
    select: {
      id: true,
      contactRef: true,
      phoneRaw: true,
      instance: true,
      platform: true,
      accountName: true,
      messageText: true,
      messagesCount: true,
      tag: true,
      createdAt: true,
      updatedAt: true,
      adSet: {
        select: {
          id: true,
          name: true,
          campaign: {
            select: {
              name: true,
              brand: {
                select: { name: true }
              }
            }
          }
        }
      }
    }
  });

  const { normalizePhone } = await import("@/lib/leadMatcher");
  const uniqueMap = new Map<string, typeof leads[0]>();
  for (const l of leads) {
    const key = normalizePhone(l.phoneRaw) || normalizePhone(l.contactRef) || l.contactRef.trim().toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, { ...l });
    } else {
      const existing = uniqueMap.get(key)!;
      if (l.messageText && existing.messageText && !existing.messageText.includes(l.messageText.trim())) {
        existing.messageText = `${existing.messageText}\n---\n${l.messageText.trim()}`;
      }
      existing.messagesCount = (existing.messagesCount || 1) + (l.messagesCount || 1);
    }
  }
  const uniqueLeads = Array.from(uniqueMap.values());

  cacheLeads.set(cacheKey, { data: uniqueLeads, expiresAt: now + 300000 }); // 5 min cache
  return uniqueLeads;
}

export async function getDashboardRecommendations(
  range: string = "30d",
  customRange?: { from?: Date; to?: Date }
) {
  const cacheKey = customRange?.from 
    ? `recs_custom_${customRange.from.toISOString()}_${customRange.to?.toISOString()}`
    : `recs_${range}`;
  const now = Date.now();
  const cached = cacheRecommendations.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const cutoff = customRange?.from 
    ? customRange.from 
    : range === "7d" 
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : range === "90d"
    ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    : range === "all"
    ? new Date("2020-01-01T00:00:00.000Z")
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const endCutoff = customRange?.to
    ? new Date(new Date(customRange.to).setHours(23, 59, 59, 999))
    : new Date();

  const [rawRows, seasonalRules] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT 
        a.id as "adSetId",
        c."products",
        c."region",
        c."objective",
        conn."platform",
        b.id as "brandId",
        b."isSeasonal" as "isSeasonalBrand",
        COALESCE(m.spend, 0)::float as spend,
        COALESCE(m.clicks, 0)::int as clicks,
        COALESCE(l.genuine, 0)::int as "genuineLeads",
        COALESCE(l.converted, 0)::int as "convertedLeads",
        COALESCE(l.total, 0)::int as "totalTaggedLeads"
      FROM "AdSet" a
      JOIN "Campaign" c ON a."campaignId" = c.id
      JOIN "Brand" b ON c."brandPageId" = b."pageId"
      JOIN "AdConnection" conn ON c."adConnectionId" = conn.id
      LEFT JOIN (
        SELECT "adSetId", SUM(spend) as spend, SUM(clicks) as clicks
        FROM "DailyMetric"
        WHERE date >= ${cutoff} AND date <= ${endCutoff}
        GROUP BY "adSetId"
      ) m ON m."adSetId" = a.id
      LEFT JOIN (
        SELECT "adSetId",
          COUNT(*) FILTER (WHERE tag IN ('GENUINE', 'CONVERTED')) as genuine,
          COUNT(*) FILTER (WHERE tag = 'CONVERTED') as converted,
          COUNT(*) as total
        FROM "Lead"
        WHERE tag != 'UNTAGGED' AND "createdAt" >= ${cutoff} AND "createdAt" <= ${endCutoff}
        GROUP BY "adSetId"
      ) l ON l."adSetId" = a.id;
    `,
    prisma.seasonalRule.findMany()
  ]);

  const lookup: SeasonalLookup = {};
  for (const rule of seasonalRules) {
    lookup[rule.product] = {
      validRegions: rule.validRegions,
      validMonths: rule.validMonths,
    };
  }

  const currentMonth = new Date().getMonth() + 1;

  const stats: AdSetStats[] = rawRows.map((r) => ({
    adSetId: r.adSetId,
    spend: Number(r.spend || 0),
    clicks: Number(r.clicks || 0),
    genuineLeads: Number(r.genuineLeads || 0),
    convertedLeads: Number(r.convertedLeads || 0),
    totalTaggedLeads: Number(r.totalTaggedLeads || 0),
    brandId: r.brandId || "unmapped",
    isSeasonalBrand: Boolean(r.isSeasonalBrand),
    products: Array.isArray(r.products) ? r.products : [],
    region: r.region || undefined,
    objective: r.objective || undefined,
    platform: r.platform || "META"
  }));

  const result = generateRecommendations(stats, lookup, currentMonth);
  cacheRecommendations.set(cacheKey, { data: result, expiresAt: now + 600000 });
  return result;
}

export interface PlatformSyncTimelineItem {
  platform: "META" | "GOOGLE" | "AMAZON";
  displayName: string;
  status: string;
  lastSyncedAt: Date | null;
  dataThroughDate: Date | null;
  accounts: Array<{
    id: string;
    label: string;
    accountId?: string;
    lastSyncedAt: Date | null;
  }>;
}

export interface SyncTimelineOverview {
  overallLastSyncedAt: Date | null;
  overallDataThroughDate: Date | null;
  platforms: {
    META: PlatformSyncTimelineItem;
    GOOGLE: PlatformSyncTimelineItem;
    AMAZON: PlatformSyncTimelineItem;
  };
}

export async function getSyncTimelineOverview(): Promise<SyncTimelineOverview> {
  const now = Date.now();
  if (cacheSyncTimeline && now < cacheSyncTimeline.expiresAt) {
    return cacheSyncTimeline.data;
  }

  const [connections, metaDaily, googleDaily, amazonDaily] = await Promise.all([
    prisma.adConnection.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        platform: true,
        label: true,
        platformAccountId: true,
        status: true,
        lastSyncedAt: true
      }
    }),
    prisma.dailyMetric.findFirst({
      where: { adSet: { campaign: { adConnection: { platform: "META" } } } },
      orderBy: { date: "desc" },
      select: { date: true }
    }),
    prisma.dailyMetric.findFirst({
      where: { adSet: { campaign: { adConnection: { platform: "GOOGLE" } } } },
      orderBy: { date: "desc" },
      select: { date: true }
    }),
    prisma.dailyMetric.findFirst({
      where: { adSet: { campaign: { adConnection: { platform: "AMAZON" } } } },
      orderBy: { date: "desc" },
      select: { date: true }
    })
  ]);

  const metaConns = connections.filter(c => c.platform === "META");
  const googleConns = connections.filter(c => c.platform === "GOOGLE");
  const amazonConns = connections.filter(c => c.platform === "AMAZON");

  const getLatestConnDate = (conns: typeof connections) => {
    let latest: Date | null = null;
    for (const c of conns) {
      if (c.lastSyncedAt && (!latest || c.lastSyncedAt > latest)) {
        latest = c.lastSyncedAt;
      }
    }
    return latest;
  };

  const metaSyncDate = getLatestConnDate(metaConns);
  const googleSyncDate = getLatestConnDate(googleConns);
  const amazonSyncDate = getLatestConnDate(amazonConns);

  const allSyncDates = [metaSyncDate, googleSyncDate, amazonSyncDate].filter(Boolean) as Date[];
  const overallLastSyncedAt = allSyncDates.length > 0
    ? new Date(Math.max(...allSyncDates.map(d => d.getTime())))
    : null;

  const allDataDates = [metaDaily?.date, googleDaily?.date, amazonDaily?.date].filter(Boolean) as Date[];
  const overallDataThroughDate = allDataDates.length > 0
    ? new Date(Math.max(...allDataDates.map(d => d.getTime())))
    : null;

  const result: SyncTimelineOverview = {
    overallLastSyncedAt,
    overallDataThroughDate,
    platforms: {
      META: {
        platform: "META",
        displayName: "Meta Ads",
        status: metaConns.some(c => c.status === "CONNECTED") ? "CONNECTED" : "DISCONNECTED",
        lastSyncedAt: metaSyncDate,
        dataThroughDate: metaDaily?.date || null,
        accounts: metaConns.map(c => ({
          id: c.id,
          label: c.label || "Meta Ad Account",
          accountId: c.platformAccountId,
          lastSyncedAt: c.lastSyncedAt
        }))
      },
      GOOGLE: {
        platform: "GOOGLE",
        displayName: "Google Ads",
        status: googleConns.some(c => c.status === "CONNECTED") ? "CONNECTED" : "DISCONNECTED",
        lastSyncedAt: googleSyncDate,
        dataThroughDate: googleDaily?.date || null,
        accounts: googleConns.map(c => ({
          id: c.id,
          label: c.label || "Google Ads Account",
          accountId: c.platformAccountId,
          lastSyncedAt: c.lastSyncedAt
        }))
      },
      AMAZON: {
        platform: "AMAZON",
        displayName: "Amazon Ads",
        status: amazonConns.some(c => c.status === "CONNECTED") ? "CONNECTED" : "DISCONNECTED",
        lastSyncedAt: amazonSyncDate,
        dataThroughDate: amazonDaily?.date || null,
        accounts: amazonConns.map(c => ({
          id: c.id,
          label: c.label || "Amazon Seller Store",
          accountId: c.platformAccountId,
          lastSyncedAt: c.lastSyncedAt
        }))
      }
    }
  };

  cacheSyncTimeline = { data: result, expiresAt: now + 300000 }; // 5 min cache
  return result;
}

export async function getOverviewStats(range: string = "30d", customRange?: { from?: Date; to?: Date }) {
  const cacheKey = customRange?.from 
    ? `stats_custom_${customRange.from.toISOString()}_${customRange.to?.toISOString()}`
    : `stats_${range}`;
  const now = Date.now();
  const cached = cacheOverviewStats.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  let dateFilter: any = undefined;
  if (customRange?.from) {
    dateFilter = {
      gte: customRange.from,
      ...(customRange.to ? { lte: new Date(new Date(customRange.to).setHours(23, 59, 59, 999)) } : {})
    };
  } else if (range === "7d") {
    dateFilter = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  } else if (range === "30d") {
    dateFilter = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  } else if (range === "90d") {
    dateFilter = { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
  }

  const aggMetrics = await prisma.dailyMetric.groupBy({
    by: ['adSetId'],
    where: dateFilter ? { date: dateFilter } : undefined,
    _sum: { spend: true }
  });

  const adSets = await prisma.adSet.findMany({
    where: { id: { in: aggMetrics.map(m => m.adSetId) } },
    select: {
      id: true,
      optimizationGoal: true,
      destinationType: true,
      campaign: { select: { objective: true } }
    }
  });

  const adSetMap = new Map(adSets.map(a => [a.id, a]));

  let messagingSpend = 0;
  let otherSpend = 0;
  const messagingAdSetIds = new Set<string>();

  for (const m of aggMetrics) {
    const adSet = adSetMap.get(m.adSetId);
    if (!adSet) continue;

    const isMsg = isMessagingAdSet(
      adSet.optimizationGoal || undefined, 
      adSet.destinationType || undefined, 
      adSet.campaign.objective || undefined
    );

    const spend = Number(m._sum.spend || 0);

    if (isMsg) {
      messagingSpend += spend;
      messagingAdSetIds.add(m.adSetId);
    } else {
      otherSpend += spend;
    }
  }

  const msgAdSetIdsArray = Array.from(messagingAdSetIds);

  // Single fast query for all tagged leads instead of 4 separate table scans
  const [taggedLeads, latestSync] = await Promise.all([
    prisma.lead.findMany({
      where: {
        tag: { not: "UNTAGGED" },
        ...(dateFilter ? { createdAt: dateFilter } : {})
      },
      select: { tag: true, adSetId: true }
    }),
    prisma.syncLog.findFirst({
      where: { status: "success" },
      orderBy: { finishedAt: "desc" }
    })
  ]);

  let genuineLeadsCount = 0;
  let otherGenuineLeadsCount = 0;
  let spamLeadsCount = 0;
  const totalTaggedCount = taggedLeads.length;

  for (const l of taggedLeads) {
    if (l.tag === "SPAM") spamLeadsCount++;
    if (l.tag === "GENUINE" || l.tag === "CONVERTED") {
      if (l.adSetId && messagingAdSetIds.has(l.adSetId)) {
        genuineLeadsCount++;
      } else {
        otherGenuineLeadsCount++;
      }
    }
  }

  const cpgl = genuineLeadsCount > 0 ? (messagingSpend / genuineLeadsCount).toFixed(0) : 0;
  const spamRate = totalTaggedCount > 0 ? Math.round((spamLeadsCount / totalTaggedCount) * 100) : 0;

  const result = {
    messagingSpend,
    otherSpend,
    genuineLeadsCount,
    otherGenuineLeadsCount,
    cpgl,
    spamRate,
    latestSync,
    messagingAdSetIds: msgAdSetIdsArray
  };

  cacheOverviewStats.set(cacheKey, { data: result, expiresAt: now + 600000 });
  return result;
}

export async function getAbandonedCartsData(options: {
  status?: string;
  search?: string;
  range?: string;
} = {}) {
  const { status = "ALL", search = "", range = "30d" } = options;

  const cacheKey = `${status}_${search.trim().toLowerCase()}_${range}`;
  const now = Date.now();
  const cached = cacheAbandonedCarts.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  let dateFilter: any = {};
  if (range === "7d") {
    dateFilter = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  } else if (range === "30d") {
    dateFilter = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  } else if (range === "90d") {
    dateFilter = { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
  }

  const whereClause: any = {};
  if (status !== "ALL") {
    whereClause.status = status;
  }
  if (Object.keys(dateFilter).length > 0) {
    whereClause.cartUpdatedAt = dateFilter;
  }
  if (search.trim()) {
    const q = search.trim();
    whereClause.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { phoneRaw: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { state: { contains: q, mode: "insensitive" } },
      { fullAddress: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rawCarts, totalAllCount, allCartsForSummary] = await Promise.all([
    prisma.abandonedCart.findMany({
      where: whereClause,
      orderBy: { cartUpdatedAt: "desc" },
      take: 300,
    }),
    prisma.abandonedCart.count(),
    prisma.abandonedCart.findMany({
      select: {
        cartValue: true,
        status: true,
      },
    }),
  ]);

  // If table is empty, auto-seed and reload
  if (totalAllCount === 0) {
    const { runAbandonedCartSync } = await import("@/lib/sync/abandonedCartSync");
    await runAbandonedCartSync();
    return getAbandonedCartsData(options);
  }

  const totalCartValue = allCartsForSummary.reduce(
    (sum, c) => sum + Number(c.cartValue || 0),
    0
  );
  const contactedCount = allCartsForSummary.filter(
    (c) => c.status === "CONTACTED"
  ).length;
  const recoveredCount = allCartsForSummary.filter(
    (c) => c.status === "RECOVERED"
  ).length;
  const recoveredValue = allCartsForSummary
    .filter((c) => c.status === "RECOVERED")
    .reduce((sum, c) => sum + Number(c.cartValue || 0), 0);
  const recoveryRate =
    allCartsForSummary.length > 0
      ? Math.round((recoveredCount / allCartsForSummary.length) * 100)
      : 0;

  const carts = rawCarts.map((c) => ({
    ...c,
    cartValue: Number(c.cartValue || 0),
    items: Array.isArray(c.items) ? c.items : [],
    remarks: Array.isArray(c.remarks) ? c.remarks : [],
  }));

  const result = {
    carts,
    summary: {
      totalCount: allCartsForSummary.length,
      filteredCount: carts.length,
      totalCartValue,
      contactedCount,
      recoveredCount,
      recoveredValue,
      recoveryRate,
    },
  };

  cacheAbandonedCarts.set(cacheKey, { data: result, expiresAt: now + 300000 }); // 5 min cache
  return result;
}

