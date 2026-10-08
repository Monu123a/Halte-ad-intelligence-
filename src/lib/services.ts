import prisma from "@/lib/prisma";
import { generateRecommendations, AdSetStats, SeasonalLookup } from "@/lib/recommendations";

export async function getDashboardRecommendations() {
  const adSets = await prisma.adSet.findMany({
    include: {
      campaign: { include: { brand: true } },
      dailyMetrics: true,
      leads: {
        where: { tag: { in: ["GENUINE", "CONVERTED"] } }
      }
    }
  });

  const seasonalRules = await prisma.seasonalRule.findMany();
  const lookup: SeasonalLookup = {};
  for (const rule of seasonalRules) {
    lookup[rule.product] = {
      validRegions: rule.validRegions,
      validMonths: rule.validMonths,
    };
  }

  const currentMonth = new Date().getMonth() + 1;

  const stats: AdSetStats[] = adSets.map((adSet) => {
    const spend = adSet.dailyMetrics.reduce((acc, curr) => acc + Number(curr.spend), 0);
    const clicks = adSet.dailyMetrics.reduce((acc, curr) => acc + curr.clicks, 0);
    const genuineLeads = adSet.leads.length;
    const convertedLeads = adSet.leads.filter(l => l.tag === "CONVERTED").length;
    
    return {
      adSetId: adSet.id,
      spend,
      clicks,
      genuineLeads,
      convertedLeads,
      brandId: adSet.campaign.brand?.id || "unmapped",
      isSeasonalBrand: adSet.campaign.brand?.isSeasonal || false,
      products: adSet.campaign.products,
      region: adSet.campaign.region || undefined,
      objective: adSet.campaign.objective,
    };
  }).filter(s => s.brandId !== "unmapped");

  return generateRecommendations(stats, lookup, currentMonth);
}

import { isMessagingAdSet } from "@/lib/recommendations";

export async function getOverviewStats() {
  const aggMetrics = await prisma.dailyMetric.groupBy({
    by: ['adSetId'],
    _sum: { spend: true }
  });

  const adSets = await prisma.adSet.findMany({
    where: { id: { in: aggMetrics.map(m => m.adSetId) } },
    include: { campaign: { select: { objective: true } } }
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

  // Cost per genuine lead = spend of messaging ad sets ÷ genuine and converted leads linked to those same ad sets.
  const msgAdSetIdsArray = Array.from(messagingAdSetIds);
  const genuineLeadsCount = await prisma.lead.count({ 
    where: { 
      tag: { in: ["GENUINE", "CONVERTED"] },
      adSetId: { in: msgAdSetIdsArray }
    } 
  });

  const otherGenuineLeadsCount = await prisma.lead.count({
    where: {
      tag: { in: ["GENUINE", "CONVERTED"] },
      adSetId: { notIn: msgAdSetIdsArray }
    }
  });
  
  const spamLeadsCount = await prisma.lead.count({ where: { tag: "SPAM" } });
  const totalTaggedCount = await prisma.lead.count({ where: { tag: { not: "UNTAGGED" } } });
  
  const cpgl = genuineLeadsCount > 0 ? (messagingSpend / genuineLeadsCount).toFixed(0) : 0;
  const spamRate = totalTaggedCount > 0 ? Math.round((spamLeadsCount / totalTaggedCount) * 100) : 0;
  
  const latestSync = await prisma.syncLog.findFirst({
    where: { status: "success" },
    orderBy: { finishedAt: "desc" }
  });

  return {
    messagingSpend,
    otherSpend,
    genuineLeadsCount,
    otherGenuineLeadsCount,
    cpgl,
    spamRate,
    latestSync,
    messagingAdSetIds: msgAdSetIdsArray
  };
}
