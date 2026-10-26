import prisma from "@/lib/prisma";
import { generateRecommendations, AdSetStats, SeasonalLookup, isMessagingAdSet } from "@/lib/recommendations";

// 60-second In-Memory Cache to make page switching instant
const cacheRecommendations = new Map<string, { data: any; expiresAt: number }>();
let cacheOverviewStats: { data: any; expiresAt: number } | null = null;
const cacheLeads = new Map<string, { data: any; expiresAt: number }>();

export function invalidateServicesCache() {
  cacheRecommendations.clear();
  cacheOverviewStats = null;
  cacheLeads.clear();
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

  cacheLeads.set(cacheKey, { data: uniqueLeads, expiresAt: now + 30000 });
  return uniqueLeads;
}

export async function getDashboardRecommendations(range: "30d" | "90d" | "all" = "30d") {
  const cacheKey = `recs_${range}`;
  const now = Date.now();
  const cached = cacheRecommendations.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  let dateSince: Date | null = null;
  if (range === "30d") {
    dateSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === "90d") {
    dateSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  }

  const [adSets, seasonalRules] = await Promise.all([
    prisma.adSet.findMany({
      select: {
        id: true,
        dailyMetrics: {
          where: dateSince ? { date: { gte: dateSince } } : undefined,
          select: { spend: true, clicks: true }
        },
        leads: {
          where: {
            tag: { not: "UNTAGGED" },
            ...(dateSince ? { createdAt: { gte: dateSince } } : {})
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
  cacheRecommendations.set(cacheKey, { data: result, expiresAt: now + 60000 });
  return result;
}

export async function getOverviewStats() {
  const now = Date.now();
  if (cacheOverviewStats && now < cacheOverviewStats.expiresAt) {
    return cacheOverviewStats.data;
  }

  const aggMetrics = await prisma.dailyMetric.groupBy({
    by: ['adSetId'],
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
        adSetId: { in: msgAdSetIdsArray }
      } 
    }),
    prisma.lead.count({
      where: {
        tag: { in: ["GENUINE", "CONVERTED"] },
        adSetId: { notIn: msgAdSetIdsArray }
      }
    }),
    prisma.lead.count({ where: { tag: "SPAM" } }),
    prisma.lead.count({ where: { tag: { not: "UNTAGGED" } } }),
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

  cacheOverviewStats = { data: result, expiresAt: now + 60000 };
  return result;
}

