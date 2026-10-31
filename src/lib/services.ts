import prisma from "@/lib/prisma";
import { generateRecommendations, AdSetStats, SeasonalLookup, isMessagingAdSet } from "@/lib/recommendations";

// In-Memory Cache to make page switching instant
const cacheRecommendations = new Map<string, { data: any; expiresAt: number }>();
let cacheOverviewStats: { data: any; expiresAt: number } | null = null;
const cacheLeads = new Map<string, { data: any; expiresAt: number }>();
let cacheSyncTimeline: { data: SyncTimelineOverview; expiresAt: number } | null = null;
const cacheAbandonedCarts = new Map<string, { data: any; expiresAt: number }>();

export function invalidateServicesCache() {
  cacheRecommendations.clear();
  cacheOverviewStats = null;
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

  const [adSets, seasonalRules] = await Promise.all([
    prisma.adSet.findMany({
      select: {
        id: true,
        dailyMetrics: {
          where: dateFilter ? { date: dateFilter } : undefined,
          select: { spend: true, clicks: true }
        },
        leads: {
          where: {
            tag: { not: "UNTAGGED" },
            ...(dateFilter ? { createdAt: dateFilter } : {})
          },
          select: { tag: true }
        },
        campaign: {
          select: {
            products: true,
            region: true,
            objective: true,
            adConnection: {
              select: { platform: true }
            },
            brand: {
              select: { id: true, isSeasonal: true }
            }
          }
        }
      }
    }),
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

  const stats: AdSetStats[] = adSets
    .filter(a => a.campaign?.brand?.id)
    .map((adSet) => {
      const spend = adSet.dailyMetrics.reduce((acc, curr) => acc + Number(curr.spend), 0);
      const clicks = adSet.dailyMetrics.reduce((acc, curr) => acc + curr.clicks, 0);
      const genuineLeads = adSet.leads.filter(l => l.tag === "GENUINE" || l.tag === "CONVERTED").length;
      const convertedLeads = adSet.leads.filter(l => l.tag === "CONVERTED").length;
      const totalTaggedLeads = adSet.leads.length;

      return {
        adSetId: adSet.id,
        spend,
        clicks,
        genuineLeads,
        convertedLeads,
        totalTaggedLeads,
        brandId: adSet.campaign?.brand?.id || "unmapped",
        isSeasonalBrand: adSet.campaign?.brand?.isSeasonal || false,
        products: adSet.campaign?.products || [],
        region: adSet.campaign?.region || undefined,
        objective: adSet.campaign?.objective || undefined,
        platform: adSet.campaign?.adConnection?.platform || "META"
      };
    }).filter(s => s.brandId !== "unmapped");

  const result = generateRecommendations(stats, lookup, currentMonth);
  cacheRecommendations.set(cacheKey, { data: result, expiresAt: now + 300000 });
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
  if (cacheOverviewStats && now < cacheOverviewStats.expiresAt && range === "30d" && !customRange?.from) {
    return cacheOverviewStats.data;
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

  // Run lead counts and sync check in parallel
  const [genuineLeadsCount, otherGenuineLeadsCount, spamLeadsCount, totalTaggedCount, latestSync] = await Promise.all([
    prisma.lead.count({ 
      where: { 
        tag: { in: ["GENUINE", "CONVERTED"] },
        adSetId: { in: msgAdSetIdsArray },
        ...(dateFilter ? { createdAt: dateFilter } : {})
      } 
    }),
    prisma.lead.count({
      where: {
        tag: { in: ["GENUINE", "CONVERTED"] },
        adSetId: { notIn: msgAdSetIdsArray },
        ...(dateFilter ? { createdAt: dateFilter } : {})
      }
    }),
    prisma.lead.count({ 
      where: { 
        tag: "SPAM",
        ...(dateFilter ? { createdAt: dateFilter } : {})
      } 
    }),
    prisma.lead.count({ 
      where: { 
        tag: { not: "UNTAGGED" },
        ...(dateFilter ? { createdAt: dateFilter } : {})
      } 
    }),
    prisma.syncLog.findFirst({
      where: { status: "success" },
      orderBy: { finishedAt: "desc" }
    })
  ]);

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

  cacheOverviewStats = { data: result, expiresAt: now + 300000 };
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

