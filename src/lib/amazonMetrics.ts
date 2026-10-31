import prisma from "@/lib/prisma";

export interface AmazonCampaignMetric {
  id: string;
  name: string;
  objective: string;
  brand: string;
  spend: number;
  impressions: number;
  clicks: number;
  orders: number;
  sales: number;
  ctr: number;
  cpc: number;
  acos: number | null;
  roas: number | null;
}

export interface AmazonPresetMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  orders: number;
  sales: number;
  ctr: number;
  cpc: number;
  acos: number | null;
  roas: number | null;
  totalCampaignsCount: number;
  campaigns: AmazonCampaignMetric[];
  allCampaigns: AmazonCampaignMetric[];
}

export interface AmazonBasicMetricsReport {
  accountName: string;
  accountId: string;
  status: string;
  lastSyncedAt: Date | null;
  all: AmazonPresetMetrics;
  "90d": AmazonPresetMetrics;
  "30d": AmazonPresetMetrics;
  "7d": AmazonPresetMetrics;
  custom?: AmazonPresetMetrics;
  [key: string]: any;
}

let amazonMetricsCache: { data: AmazonBasicMetricsReport; expiresAt: number } | null = null;

export function invalidateAmazonMetricsCache() {
  amazonMetricsCache = null;
}

export async function getAmazonOverviewMetrics(customRange?: { from?: Date; to?: Date }): Promise<AmazonBasicMetricsReport> {
  const nowMs = Date.now();
  if (!customRange?.from && amazonMetricsCache && nowMs < amazonMetricsCache.expiresAt) {
    return amazonMetricsCache.data;
  }

  const conn = await prisma.adConnection.findFirst({
    where: { platform: "AMAZON" },
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

  const emptyPreset: AmazonPresetMetrics = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    orders: 0,
    sales: 0,
    ctr: 0,
    cpc: 0,
    acos: null,
    roas: null,
    totalCampaignsCount: 0,
    campaigns: [],
    allCampaigns: []
  };

  if (!conn) {
    return {
      accountName: "Amazon Ads Store",
      accountId: "Not Linked",
      status: "DISCONNECTED",
      lastSyncedAt: null,
      all: emptyPreset,
      "90d": emptyPreset,
      "30d": emptyPreset,
      "7d": emptyPreset,
      custom: emptyPreset
    };
  }

  const now = new Date();
  const dateRanges: Record<string, { start: Date; end?: Date }> = {
    all: { start: new Date("2020-01-01T00:00:00.000Z") },
    "90d": { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
    "30d": { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
    "7d": { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
  };

  if (customRange?.from) {
    dateRanges["custom"] = {
      start: customRange.from,
      end: customRange.to ? new Date(new Date(customRange.to).setHours(23, 59, 59, 999)) : undefined
    };
  }

  const report: Partial<AmazonBasicMetricsReport> = {
    accountName: conn.label || `Amazon Ads (${conn.platformAccountId})`,
    accountId: conn.platformAccountId,
    status: conn.status,
    lastSyncedAt: conn.lastSyncedAt
  };

  for (const [key, rangeDef] of Object.entries(dateRanges)) {
    const minDate = rangeDef.start;
    const maxDate = rangeDef.end;

    let totalSpend = 0;
    let totalImp = 0;
    let totalClicks = 0;
    let totalOrders = 0;
    let totalSales = 0;

    const campList: AmazonCampaignMetric[] = [];
    const allCampList: AmazonCampaignMetric[] = [];

    for (const c of conn.campaigns) {
      let cSpend = 0;
      let cImp = 0;
      let cClicks = 0;
      let cOrders = 0;
      let cSales = 0;

      for (const a of c.adSets) {
        for (const m of a.dailyMetrics) {
          const mDate = new Date(m.date);
          if (mDate < minDate) continue;
          if (maxDate && mDate > maxDate) continue;

          const s = Number(m.spend);
          cSpend += s;
          cImp += m.impressions;
          cClicks += m.clicks;

          const raw = m.rawResponse as any;
          if (raw?.orders) cOrders += Number(raw.orders);
          if (raw?.conversions && !raw?.orders) cOrders += Number(raw.conversions);
          if (raw?.sales) cSales += Number(raw.sales);
        }
      }

      const ctr = cImp > 0 ? Math.round((cClicks / cImp) * 10000) / 100 : 0;
      const cpc = cClicks > 0 ? Math.round((cSpend / cClicks) * 100) / 100 : 0;
      const acos = cSales > 0 ? Math.round((cSpend / cSales) * 1000) / 10 : null;
      const roas = cSpend > 0 ? Math.round((cSales / cSpend) * 100) / 100 : null;

      const campMetric: AmazonCampaignMetric = {
        id: c.id,
        name: c.name,
        objective: c.objective,
        brand: c.brand?.name || "Halte / General",
        spend: Math.round(cSpend),
        impressions: cImp,
        clicks: cClicks,
        orders: cOrders,
        sales: Math.round(cSales),
        ctr,
        cpc,
        acos,
        roas
      };

      allCampList.push(campMetric);

      if (cImp > 0 || cSpend > 0) {
        totalSpend += cSpend;
        totalImp += cImp;
        totalClicks += cClicks;
        totalOrders += cOrders;
        totalSales += cSales;
        campList.push(campMetric);
      }
    }

    campList.sort((a, b) => b.spend - a.spend);
    allCampList.sort((a, b) => b.spend - a.spend || a.name.localeCompare(b.name));

    const nationalCtr = totalImp > 0 ? Math.round((totalClicks / totalImp) * 10000) / 100 : 0;
    const nationalCpc = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0;
    const nationalAcos = totalSales > 0 ? Math.round((totalSpend / totalSales) * 1000) / 10 : null;
    const nationalRoas = totalSpend > 0 ? Math.round((totalSales / totalSpend) * 100) / 100 : null;

    report[key] = {
      spend: Math.round(totalSpend),
      impressions: totalImp,
      clicks: totalClicks,
      orders: totalOrders,
      sales: Math.round(totalSales),
      ctr: nationalCtr,
      cpc: nationalCpc,
      acos: nationalAcos,
      roas: nationalRoas,
      totalCampaignsCount: conn.campaigns.length,
      campaigns: campList,
      allCampaigns: allCampList
    };
  }

  const finalReport = report as AmazonBasicMetricsReport;
  if (!customRange?.from) {
    amazonMetricsCache = { data: finalReport, expiresAt: Date.now() + 600000 };
  }
  return finalReport;
}
