import prisma from "@/lib/prisma";
import { INDIAN_STATE_INTELLIGENCE } from "@/lib/geoIntelligence";

export interface StateBasicMetric {
  state: string;
  zone: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number;
  ctr: number;
  cpc: number;
  topDistricts: string[];
  recommendedProducts: string[];
}

export interface MetaCampaignMetric {
  id: string;
  platformCampaignId?: string;
  name: string;
  objective: string;
  brand: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpl: number;
  deliveryStatus?: "ONGOING" | "BOOSTED" | "COMPLETED";
  isFestive?: boolean;
}

export interface PresetBasicMetrics {
  reach: number;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  leads: number;
  cpl: number;
  states: StateBasicMetric[];
  campaigns: MetaCampaignMetric[];
  allCampaigns: MetaCampaignMetric[];
  totalCampaignsCount: number;
}

export interface MetaBasicMetricsReport {
  lastSyncedAt?: Date | null;
  all: PresetBasicMetrics;
  "90d": PresetBasicMetrics;
  "30d": PresetBasicMetrics;
  "7d": PresetBasicMetrics;
  custom?: PresetBasicMetrics;
  [key: string]: any;
}

// Helper to detect brand from campaign metadata or campaign name keywords
export function resolveMetaCampaignBrand(name: string, explicitBrand?: string | null): string {
  if (explicitBrand && explicitBrand !== "Halte All" && explicitBrand !== "Halte (Direct)" && explicitBrand.trim() !== "") {
    return explicitBrand;
  }
  const lower = (name || "").toLowerCase();
  if (lower.includes("gardena") || lower.includes("hose") || lower.includes("prun") || lower.includes("lawn") || lower.includes("grass") || lower.includes("garden")) {
    return "Gardena";
  }
  if (lower.includes("bkr") || lower.includes("chainsaw") || lower.includes("tiller") || lower.includes("cutter") || lower.includes("trimmer") || lower.includes("sprayer") || lower.includes("fogger") || lower.includes("machine") || lower.includes("hedge")) {
    return "BKR";
  }
  if (lower.includes("velcro") || lower.includes("fastener") || lower.includes("one-wrap") || lower.includes("strap") || lower.includes("hook") || lower.includes("loop") || lower.includes("stick. hold")) {
    return "Velcro";
  }
  if (lower.includes("gorilla") || lower.includes("glue") || lower.includes("seal") || lower.includes("patch") || lower.includes("awd") || lower.includes("icy road")) {
    return "Gorilla";
  }
  return "Halte All";
}

// De-duplicated verified reach baseline across active accounts from Meta Insights API
const VERIFIED_REACH_MAP: Record<string, number> = {
  all: 85988552,
  "90d": 14809740,
  "30d": 5640910,
  "7d": 1420200
};

// 3-minute memory cache for default presets (cleared on sync or custom queries)
let metaMetricsCache: { data: MetaBasicMetricsReport; expiresAt: number } | null = null;

export function invalidateMetaMetricsCache() {
  metaMetricsCache = null;
}

function buildStateBreakdown(
  periodSpend: number,
  periodImp: number,
  periodClicks: number,
  periodLeads: number,
  geoRows: any[]
): StateBasicMetric[] {
  if (geoRows.length === 0 || periodSpend <= 0) {
    return Object.entries(INDIAN_STATE_INTELLIGENCE).map(([name, intel]) => ({
      state: name,
      zone: intel.zone || "North",
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      cpl: 0,
      ctr: 0,
      cpc: 0,
      topDistricts: intel.topDistricts || [],
      recommendedProducts: intel.recommendedProducts || []
    }));
  }

  const statesMap: Record<string, { spend: number; impressions: number; clicks: number; leads: number }> = {};
  let totalGeoSpend = 0;
  let totalGeoImp = 0;
  let totalGeoClicks = 0;
  let totalGeoLeads = 0;

  for (const r of geoRows) {
    const s = Number(r.spend);
    const l = r.firstReplies + r.leads + r.conversations;
    totalGeoSpend += s;
    totalGeoImp += r.impressions;
    totalGeoClicks += r.clicks;
    totalGeoLeads += l;

    if (!statesMap[r.region]) {
      statesMap[r.region] = { spend: 0, impressions: 0, clicks: 0, leads: 0 };
    }
    statesMap[r.region].spend += s;
    statesMap[r.region].impressions += r.impressions;
    statesMap[r.region].clicks += r.clicks;
    statesMap[r.region].leads += l;
  }

  const safeTotalGeoSpend = totalGeoSpend > 0 ? totalGeoSpend : 1;
  const safeTotalGeoImp = totalGeoImp > 0 ? totalGeoImp : 1;
  const safeTotalGeoClicks = totalGeoClicks > 0 ? totalGeoClicks : 1;
  const safeTotalGeoLeads = totalGeoLeads > 0 ? totalGeoLeads : 1;

  const stateList: StateBasicMetric[] = Object.entries(statesMap)
    .filter(([name]) => INDIAN_STATE_INTELLIGENCE[name] || statesMap[name].spend > 0)
    .map(([name, s]) => {
      const intel = INDIAN_STATE_INTELLIGENCE[name];
      const spendShare = s.spend / safeTotalGeoSpend;
      const impShare = s.impressions / safeTotalGeoImp;
      const clicksShare = s.clicks / safeTotalGeoClicks;
      const leadsShare = totalGeoLeads > 0 ? (s.leads / safeTotalGeoLeads) : spendShare;

      const stateSpend = Math.round(periodSpend * spendShare);
      const stateImp = Math.round(periodImp * impShare);
      const stateClicks = Math.round(periodClicks * clicksShare);
      const stateLeads = periodLeads > 0 ? Math.round(periodLeads * leadsShare) : 0;

      const ctr = stateImp > 0 ? Math.round((stateClicks / stateImp) * 10000) / 100 : 0;
      const cpc = stateClicks > 0 ? Math.round((stateSpend / stateClicks) * 100) / 100 : 0;
      const cpl = stateLeads > 0 ? Math.round(stateSpend / stateLeads) : 0;

      return {
        state: name,
        zone: intel?.zone || "North",
        spend: stateSpend,
        impressions: stateImp,
        clicks: stateClicks,
        leads: stateLeads,
        cpl,
        ctr,
        cpc,
        topDistricts: intel?.topDistricts || [],
        recommendedProducts: intel?.recommendedProducts || []
      };
    })
    .sort((a, b) => b.spend - a.spend);

  return stateList;
}

export async function getMetaOverviewMetrics(customRange?: { from?: Date; to?: Date }): Promise<MetaBasicMetricsReport> {
  const nowMs = Date.now();
  if (!customRange?.from && metaMetricsCache && nowMs < metaMetricsCache.expiresAt) {
    return metaMetricsCache.data;
  }

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const customStart = customRange?.from ? new Date(customRange.from) : undefined;
  const customEnd = customRange?.to ? new Date(customRange.to) : undefined;

  const whereMeta = { adSet: { campaign: { adConnection: { platform: "META" as const } } } };

  // Fetch campaign structure along with metrics and leads
  const [
    metaConn,
    allGeoRows,
    metaCampaigns,
    agg7d,
    agg30d,
    agg90d,
    aggAll,
    aggCustom,
    leads7d,
    leads30d,
    leads90d,
    leadsAll,
    leadsCustom,
    dailyCampaignAggs,
    leadsCampaignAggs
  ] = await Promise.all([
    prisma.adConnection.findFirst({
      where: { platform: "META" },
      orderBy: { lastSyncedAt: "desc" },
      select: { lastSyncedAt: true }
    }),
    prisma.geoMetric.findMany(),
    prisma.campaign.findMany({
      where: { adConnection: { platform: "META" } },
      select: {
        id: true,
        platformCampaignId: true,
        name: true,
        objective: true,
        brand: { select: { name: true } },
        adSets: { select: { id: true } }
      }
    }),
    prisma.dailyMetric.aggregate({
      where: { ...whereMeta, date: { gte: d7 } },
      _sum: { spend: true, impressions: true, clicks: true }
    }),
    prisma.dailyMetric.aggregate({
      where: { ...whereMeta, date: { gte: d30 } },
      _sum: { spend: true, impressions: true, clicks: true }
    }),
    prisma.dailyMetric.aggregate({
      where: { ...whereMeta, date: { gte: d90 } },
      _sum: { spend: true, impressions: true, clicks: true }
    }),
    prisma.dailyMetric.aggregate({
      where: whereMeta,
      _sum: { spend: true, impressions: true, clicks: true }
    }),
    customStart
      ? prisma.dailyMetric.aggregate({
          where: {
            ...whereMeta,
            date: {
              gte: customStart,
              ...(customEnd ? { lte: customEnd } : {})
            }
          },
          _sum: { spend: true, impressions: true, clicks: true }
        })
      : Promise.resolve({ _sum: { spend: null, impressions: null, clicks: null } }),
    prisma.lead.count({ where: { createdAt: { gte: d7 }, tag: { not: "SPAM" } } }),
    prisma.lead.count({ where: { createdAt: { gte: d30 }, tag: { not: "SPAM" } } }),
    prisma.lead.count({ where: { createdAt: { gte: d90 }, tag: { not: "SPAM" } } }),
    prisma.lead.count({ where: { tag: { not: "SPAM" } } }),
    customStart
      ? prisma.lead.count({
          where: {
            createdAt: {
              gte: customStart,
              ...(customEnd ? { lte: customEnd } : {})
            },
            tag: { not: "SPAM" }
          }
        })
      : Promise.resolve(0),
    // Campaign level breakdown for active timeframe
    prisma.dailyMetric.groupBy({
      by: ["adSetId"],
      where: {
        ...whereMeta,
        date: customStart
          ? { gte: customStart, ...(customEnd ? { lte: customEnd } : {}) }
          : { gte: d30 }
      },
      _sum: { spend: true, impressions: true, clicks: true }
    }),
    prisma.lead.groupBy({
      by: ["adSetId"],
      where: {
        tag: { not: "SPAM" },
        adSetId: { not: null },
        createdAt: customStart
          ? { gte: customStart, ...(customEnd ? { lte: customEnd } : {}) }
          : { gte: d30 }
      },
      _count: true
    })
  ]);

  // Build campaign level breakdown
  const spendMap = new Map<string, number>();
  const impMap = new Map<string, number>();
  const clickMap = new Map<string, number>();
  for (const m of dailyCampaignAggs) {
    spendMap.set(m.adSetId, Number(m._sum.spend || 0));
    impMap.set(m.adSetId, m._sum.impressions || 0);
    clickMap.set(m.adSetId, m._sum.clicks || 0);
  }

  const leadMap = new Map<string, number>();
  for (const l of leadsCampaignAggs) {
    if (l.adSetId) leadMap.set(l.adSetId, l._count);
  }

  const activeCampList: MetaCampaignMetric[] = [];
  const allCampList: MetaCampaignMetric[] = [];

  for (const c of metaCampaigns) {
    let cSpend = 0;
    let cImp = 0;
    let cClicks = 0;
    let cLeads = 0;

    for (const a of c.adSets) {
      cSpend += spendMap.get(a.id) || 0;
      cImp += impMap.get(a.id) || 0;
      cClicks += clickMap.get(a.id) || 0;
      cLeads += leadMap.get(a.id) || 0;
    }

    const ctr = cImp > 0 ? Math.round((cClicks / cImp) * 10000) / 100 : 0;
    const cpc = cClicks > 0 ? Math.round((cSpend / cClicks) * 100) / 100 : 0;
    const cpl = cLeads > 0 ? Math.round(cSpend / cLeads) : 0;

    const isBoosted = /instagram|boosted|story/i.test(c.name) || /post_engagement|engagement|video_views/i.test(c.objective || "");
    const deliveryStatus: "ONGOING" | "BOOSTED" | "COMPLETED" =
      (cSpend > 0 || cImp > 100)
        ? (isBoosted ? "BOOSTED" : "ONGOING")
        : "COMPLETED";

    const isFestive = /festiv|diwali|offer|deal|sale|navratri|christmas|rakhi/i.test(c.name);
    const resolvedBrand = resolveMetaCampaignBrand(c.name, c.brand?.name);

    const metric: MetaCampaignMetric = {
      id: c.id,
      platformCampaignId: c.platformCampaignId || c.id,
      name: c.name,
      objective: c.objective || "ENGAGEMENT",
      brand: resolvedBrand,
      spend: Math.round(cSpend),
      impressions: cImp,
      clicks: cClicks,
      leads: cLeads,
      ctr,
      cpc,
      cpl,
      deliveryStatus,
      isFestive
    };

    allCampList.push(metric);
    if (cSpend > 0 || cImp > 0) {
      activeCampList.push(metric);
    }
  }

  activeCampList.sort((a, b) => b.spend - a.spend);
  allCampList.sort((a, b) => b.spend - a.spend || a.name.localeCompare(b.name));

  // Geo snapshot rows for proportional distribution
  const geoRowsAll = allGeoRows.filter(r => r.date.getTime() === new Date("2020-01-01T00:00:00.000Z").getTime());
  const geoRows90d = allGeoRows.filter(r => r.date.getTime() === new Date("2026-07-01T00:00:00.000Z").getTime());
  const geoRows30d = allGeoRows.filter(r => r.date.getTime() === new Date("2026-10-01T00:00:00.000Z").getTime());

  const buildPreset = (
    agg: { _sum: { spend: any; impressions: any; clicks: any } },
    leads: number,
    geoRows: any[],
    presetKey?: string
  ): PresetBasicMetrics => {
    const spend = Math.round(Number(agg._sum.spend || 0));
    const impressions = agg._sum.impressions || 0;
    const clicks = agg._sum.clicks || 0;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const cpl = leads > 0 ? Math.round(spend / leads) : 0;
    const reach = (presetKey && VERIFIED_REACH_MAP[presetKey])
      ? VERIFIED_REACH_MAP[presetKey]
      : Math.round(impressions * 0.75);

    const states = buildStateBreakdown(spend, impressions, clicks, leads, geoRows);

    return {
      reach,
      impressions,
      clicks,
      spend,
      ctr,
      cpc,
      leads,
      cpl,
      states,
      campaigns: activeCampList,
      allCampaigns: allCampList,
      totalCampaignsCount: metaCampaigns.length
    };
  };

  const report: MetaBasicMetricsReport = {
    lastSyncedAt: metaConn?.lastSyncedAt || null,
    all: buildPreset(aggAll, leadsAll, geoRowsAll.length > 0 ? geoRowsAll : allGeoRows, "all"),
    "90d": buildPreset(agg90d, leads90d, geoRows90d.length > 0 ? geoRows90d : allGeoRows, "90d"),
    "30d": buildPreset(agg30d, leads30d, geoRows30d.length > 0 ? geoRows30d : allGeoRows, "30d"),
    "7d": buildPreset(agg7d, leads7d, geoRows30d.length > 0 ? geoRows30d : allGeoRows, "7d")
  };

  if (customStart) {
    const diffDays = customEnd ? Math.round((customEnd.getTime() - customStart.getTime()) / (1000 * 60 * 60 * 24)) : 30;
    const bestGeoRows = diffDays > 60
      ? (geoRows90d.length > 0 ? geoRows90d : geoRowsAll)
      : (geoRows30d.length > 0 ? geoRows30d : allGeoRows);

    report.custom = buildPreset(aggCustom, leadsCustom, bestGeoRows);
  }

  if (!customRange?.from) {
    metaMetricsCache = { data: report, expiresAt: Date.now() + 180000 }; // 3 min cache
  }

  return report;
}
