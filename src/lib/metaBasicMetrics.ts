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
}

export interface MetaBasicMetricsReport {
  all: PresetBasicMetrics;
  "90d": PresetBasicMetrics;
  "30d": PresetBasicMetrics;
}

const PRESET_DATES = {
  all: new Date("2020-01-01T00:00:00.000Z"),
  "90d": new Date("2026-07-01T00:00:00.000Z"),
  "30d": new Date("2026-10-01T00:00:00.000Z")
};

// De-duplicated verified reach across all active accounts from Meta Insights API
const VERIFIED_REACH_MAP = {
  all: 85988552,
  "90d": 14809740,
  "30d": 5640910
};

export async function getMetaOverviewMetrics(): Promise<MetaBasicMetricsReport> {
  const report: Partial<MetaBasicMetricsReport> = {};

  for (const [key, date] of Object.entries(PRESET_DATES) as Array<[keyof typeof PRESET_DATES, Date]>) {
    const rows = await prisma.geoMetric.findMany({ where: { date } });
    let totalImp = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalLeads = 0;

    const statesMap: Record<string, { spend: number; impressions: number; clicks: number; leads: number }> = {};

    for (const r of rows) {
      const spend = Number(r.spend);
      const leads = r.firstReplies + r.leads + r.conversations;
      totalImp += r.impressions;
      totalClicks += r.clicks;
      totalSpend += spend;
      totalLeads += leads;

      if (!statesMap[r.region]) {
        statesMap[r.region] = { spend: 0, impressions: 0, clicks: 0, leads: 0 };
      }
      statesMap[r.region].spend += spend;
      statesMap[r.region].impressions += r.impressions;
      statesMap[r.region].clicks += r.clicks;
      statesMap[r.region].leads += leads;
    }

    const stateList: StateBasicMetric[] = Object.entries(statesMap)
      .filter(([name]) => INDIAN_STATE_INTELLIGENCE[name] || statesMap[name].leads > 5)
      .map(([name, s]) => {
        const intel = INDIAN_STATE_INTELLIGENCE[name];
        return {
          state: name,
          zone: intel?.zone || "North",
          spend: Math.round(s.spend),
          impressions: s.impressions,
          clicks: s.clicks,
          leads: s.leads,
          cpl: s.leads > 0 ? Math.round(s.spend / s.leads) : 0,
          ctr: s.impressions > 0 ? Math.round((s.clicks / s.impressions) * 10000) / 100 : 0,
          cpc: s.clicks > 0 ? Math.round((s.spend / s.clicks) * 100) / 100 : 0,
          topDistricts: intel?.topDistricts || [],
          recommendedProducts: intel?.recommendedProducts || []
        };
      })
      .sort((a, b) => b.spend - a.spend);

    const nationalCtr = totalImp > 0 ? Math.round((totalClicks / totalImp) * 10000) / 100 : 0;
    const nationalCpc = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0;
    const nationalCpl = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;

    report[key] = {
      reach: VERIFIED_REACH_MAP[key],
      impressions: totalImp,
      clicks: totalClicks,
      spend: Math.round(totalSpend),
      ctr: nationalCtr,
      cpc: nationalCpc,
      leads: totalLeads,
      cpl: nationalCpl,
      states: stateList
    };
  }

  return report as MetaBasicMetricsReport;
}
