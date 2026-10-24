import prisma from "@/lib/prisma";

export interface GoogleCampaignMetric {
  id: string;
  name: string;
  objective: string;
  brand: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  avgIS: number | null;
  avgLostBudget: number | null;
  avgLostRank: number | null;
}

export interface GooglePresetMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  avgIS: number | null;
  avgLostBudget: number | null;
  avgLostRank: number | null;
  totalCampaignsCount: number;
  campaigns: GoogleCampaignMetric[];
  allCampaigns: GoogleCampaignMetric[];
}

export interface GoogleBasicMetricsReport {
  accountName: string;
  customerId: string;
  status: string;
  lastSyncedAt: Date | null;
  all: GooglePresetMetrics;
  "90d": GooglePresetMetrics;
  "30d": GooglePresetMetrics;
}

export async function getGoogleOverviewMetrics(): Promise<GoogleBasicMetricsReport> {
  const conn = await prisma.adConnection.findFirst({
    where: { platform: "GOOGLE" },
    include: {
      campaigns: {
        include: {
          brand: true,
          adSets: {
            include: {
              dailyMetrics: true
            }
          }
        }
      }
    }
  });

  const emptyPreset: GooglePresetMetrics = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
    avgIS: null,
    avgLostBudget: null,
    avgLostRank: null,
    totalCampaignsCount: 0,
    campaigns: [],
    allCampaigns: []
  };

  if (!conn) {
    return {
      accountName: "Google Ads Account",
      customerId: "Not Connected",
      status: "DISCONNECTED",
      lastSyncedAt: null,
      all: emptyPreset,
      "90d": emptyPreset,
      "30d": emptyPreset
    };
  }

  const now = new Date();
  const dateRanges = {
    all: new Date("2020-01-01T00:00:00.000Z"),
    "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  };

  const report: Partial<GoogleBasicMetricsReport> = {
    accountName: conn.label || `Google Ads (${conn.platformAccountId})`,
    customerId: conn.platformAccountId,
    status: conn.status,
    lastSyncedAt: conn.lastSyncedAt
  };

  for (const [key, minDate] of Object.entries(dateRanges) as Array<[keyof typeof dateRanges, Date]>) {
    let totalSpend = 0;
    let totalImp = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    const globalISList: number[] = [];
    const globalLostBudgetList: number[] = [];
    const globalLostRankList: number[] = [];

    const campList: GoogleCampaignMetric[] = [];
    const allCampList: GoogleCampaignMetric[] = [];

    for (const c of conn.campaigns) {
      let cSpend = 0;
      let cImp = 0;
      let cClicks = 0;
      let cConv = 0;
      const isList: number[] = [];
      const lostBudgetList: number[] = [];
      const lostRankList: number[] = [];

      for (const a of c.adSets) {
        for (const m of a.dailyMetrics) {
          if (new Date(m.date) < minDate) continue;

          const s = Number(m.spend);
          cSpend += s;
          cImp += m.impressions;
          cClicks += m.clicks;

          const raw = m.rawResponse as any;
          if (raw?.conversions) cConv += Number(raw.conversions);
          if (raw?.searchImpressionShare != null) {
            const val = Number(raw.searchImpressionShare) * 100;
            isList.push(val);
            globalISList.push(val);
          }
          if (raw?.searchBudgetLostImpressionShare != null) {
            const val = Number(raw.searchBudgetLostImpressionShare) * 100;
            lostBudgetList.push(val);
            globalLostBudgetList.push(val);
          }
          if (raw?.searchRankLostImpressionShare != null) {
            const val = Number(raw.searchRankLostImpressionShare) * 100;
            lostRankList.push(val);
            globalLostRankList.push(val);
          }
        }
      }

      const avgIS = isList.length > 0 ? isList.reduce((a, b) => a + b, 0) / isList.length : null;
      const avgLostBudget = lostBudgetList.length > 0 ? lostBudgetList.reduce((a, b) => a + b, 0) / lostBudgetList.length : null;
      const avgLostRank = lostRankList.length > 0 ? lostRankList.reduce((a, b) => a + b, 0) / lostRankList.length : null;

      const campMetric: GoogleCampaignMetric = {
        id: c.id,
        name: c.name,
        objective: c.objective,
        brand: c.brand?.name || "Halte / General",
        spend: Math.round(cSpend),
        impressions: cImp,
        clicks: cClicks,
        conversions: cConv,
        ctr: cImp > 0 ? Math.round((cClicks / cImp) * 10000) / 100 : 0,
        cpc: cClicks > 0 ? Math.round((cSpend / cClicks) * 100) / 100 : 0,
        avgIS: avgIS != null ? Math.round(avgIS * 10) / 10 : null,
        avgLostBudget: avgLostBudget != null ? Math.round(avgLostBudget * 10) / 10 : null,
        avgLostRank: avgLostRank != null ? Math.round(avgLostRank * 10) / 10 : null
      };

      allCampList.push(campMetric);

      if (cImp > 0 || cSpend > 0) {
        totalSpend += cSpend;
        totalImp += cImp;
        totalClicks += cClicks;
        totalConversions += cConv;
        campList.push(campMetric);
      }
    }

    campList.sort((a, b) => b.spend - a.spend);
    allCampList.sort((a, b) => b.spend - a.spend || a.name.localeCompare(b.name));

    const nationalCtr = totalImp > 0 ? Math.round((totalClicks / totalImp) * 10000) / 100 : 0;
    const nationalCpc = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0;
    const avgIS = globalISList.length > 0 ? Math.round((globalISList.reduce((a, b) => a + b, 0) / globalISList.length) * 10) / 10 : null;
    const avgLostBudget = globalLostBudgetList.length > 0 ? Math.round((globalLostBudgetList.reduce((a, b) => a + b, 0) / globalLostBudgetList.length) * 10) / 10 : null;
    const avgLostRank = globalLostRankList.length > 0 ? Math.round((globalLostRankList.reduce((a, b) => a + b, 0) / globalLostRankList.length) * 10) / 10 : null;

    report[key] = {
      spend: Math.round(totalSpend),
      impressions: totalImp,
      clicks: totalClicks,
      conversions: totalConversions,
      ctr: nationalCtr,
      cpc: nationalCpc,
      avgIS,
      avgLostBudget,
      avgLostRank,
      totalCampaignsCount: conn.campaigns.length,
      campaigns: campList,
      allCampaigns: allCampList
    };
  }

  return report as GoogleBasicMetricsReport;
}
