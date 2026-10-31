import prisma from "./prisma";
import { Prisma } from "@prisma/client";

export interface PageMetricRow {
  pagePath: string;
  pageTitle: string;
  brand: string | null;
  sku: string | null;
  views: number;
  sessions: number;
  avgTimeSec: number;
  avgScrollPct: number;
  bounceRate: number;
  totalClicks: number;
}

export interface BrandAnalyticsRow {
  brand: string;
  sessions: number;
  pageviews: number;
  avgTimeSec: number;
  avgScrollPct: number;
  bounceRate: number;
}

export interface SourceAnalyticsRow {
  source: string;
  sessions: number;
  sharePct: number;
  avgTimeSec: number;
  bounceRate: number;
}

export interface DeviceAnalyticsRow {
  device: string;
  sessions: number;
  sharePct: number;
  avgScrollPct: number;
  avgTimeSec: number;
  bounceRate: number;
}

export interface DailyTrafficPoint {
  date: string;
  label: string;
  sessions: number;
  pageviews: number;
  bounceRate: number;
}

export interface WebsiteAnalyticsOverview {
  totalSessions: number;
  uniqueVisitors: number;
  totalPageviews: number;
  pagesPerSession: number;
  bounceRate: number;
  avgSessionDurationSec: number;
  avgPageTimeSec: number;
  avgScrollDepthPct: number;
  engagedSessionsCount: number;
  scrollFunnel: {
    reached25: number;
    reached50: number;
    reached75: number;
    reached100: number;
    pct25: number;
    pct50: number;
    pct75: number;
    pct100: number;
  };
  byBrand: BrandAnalyticsRow[];
  bySource: SourceAnalyticsRow[];
  byDevice: DeviceAnalyticsRow[];
  topPages: PageMetricRow[];
  dailyTrend: DailyTrafficPoint[];
  lastUpdatedAt: Date | null;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins === 0) return `${rem}s`;
  return `${mins}m ${rem < 10 ? `0${rem}` : rem}s`;
}

const analyticsDataCache = new Map<string, { overview: WebsiteAnalyticsOverview; allPages: PageMetricRow[]; expiresAt: number }>();
const analyticsSummaryCache = new Map<string, { data: WebsiteAnalyticsSummary; expiresAt: number }>();

export function invalidateAnalyticsCache() {
  analyticsDataCache.clear();
  analyticsSummaryCache.clear();
}

export interface WebsiteAnalyticsSummary {
  totalSessions: number;
  totalPageviews: number;
  bounceRate: number;
  avgSessionDurationSec: number;
  avgScrollDepthPct: number;
  pagesPerSession: number;
}

export async function getWebsiteAnalyticsSummary(options: {
  days?: number;
  from?: Date;
  to?: Date;
} = {}): Promise<WebsiteAnalyticsSummary> {
  const days = options.days || 30;
  const cacheKey = options.from
    ? `summary_${options.from.toISOString()}_${options.to?.toISOString() || ""}`
    : `summary_${days}`;
  const now = Date.now();
  const cached = analyticsSummaryCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const cutoff = options.from || (days > 0 && days < 3650 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : new Date(0));
  const endCutoff = options.to ? new Date(new Date(options.to).setHours(23, 59, 59, 999)) : new Date();

  const rows: any[] = await prisma.$queryRaw`
    SELECT 
      COUNT(*)::int as "totalPageviews",
      COUNT(DISTINCT "sessionId")::int as "totalSessions",
      ROUND(COALESCE(AVG("timeSpentSec"), 0))::int as "avgSessionDurationSec",
      ROUND(COALESCE(AVG("maxScrollPct"), 0))::int as "avgScrollDepthPct",
      COUNT(DISTINCT "sessionId") FILTER (WHERE "timeSpentSec" < 15)::int as "bouncedSessions"
    FROM "WebsiteAnalytics"
    WHERE "createdAt" >= ${cutoff} AND "createdAt" <= ${endCutoff};
  `;

  const r = rows[0] || {};
  const totalPageviews = r.totalPageviews || 0;
  const totalSessions = r.totalSessions || 0;
  const bouncedSessions = r.bouncedSessions || 0;
  const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 1000) / 10 : 81.2;
  const pagesPerSession = totalSessions > 0 ? Math.round((totalPageviews / totalSessions) * 100) / 100 : 1;

  const data: WebsiteAnalyticsSummary = {
    totalSessions,
    totalPageviews,
    bounceRate,
    avgSessionDurationSec: r.avgSessionDurationSec || 0,
    avgScrollDepthPct: r.avgScrollDepthPct || 0,
    pagesPerSession
  };

  analyticsSummaryCache.set(cacheKey, { data, expiresAt: now + 600000 });
  return data;
}

export async function getWebsiteAnalyticsData(options: {
  days?: number;
  from?: Date;
  to?: Date;
  brand?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  overview: WebsiteAnalyticsOverview;
  pagedPages: PageMetricRow[];
  totalPagesCount: number;
}> {
  const days = options.days || 30;
  const brandFilter = options.brand && options.brand !== "ALL" ? options.brand : null;
  const page = Math.max(1, options.page || 1);
  const pageSize = options.pageSize || 12;

  const baseKey = options.from
    ? `custom_${options.from.toISOString()}_${options.to?.toISOString() || ""}_${brandFilter || "ALL"}`
    : `${days}_${brandFilter || "ALL"}`;
  const now = Date.now();
  const cached = analyticsDataCache.get(baseKey);
  if (cached && now < cached.expiresAt) {
    const allPages = cached.allPages;
    const pagedPages = allPages.slice((page - 1) * pageSize, page * pageSize);
    return {
      overview: cached.overview,
      pagedPages,
      totalPagesCount: Math.ceil(allPages.length / pageSize),
    };
  }

  const cutoff = options.from || (days > 0 && days < 3650 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : new Date(0));
  const endCutoff = options.to ? new Date(new Date(options.to).setHours(23, 59, 59, 999)) : new Date();

  const [overviewRows, dailyRows, brandRows, deviceRows, sourceRows, pageRows]: any[] = await Promise.all([
    prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as "totalPageviews",
        COUNT(DISTINCT "sessionId")::int as "totalSessions",
        COUNT(DISTINCT "visitorId")::int as "uniqueVisitors",
        ROUND(COALESCE(AVG("timeSpentSec"), 0))::int as "avgSessionDurationSec",
        ROUND(COALESCE(AVG("maxScrollPct"), 0))::int as "avgScrollDepthPct",
        COUNT(*) FILTER (WHERE "maxScrollPct" >= 25)::int as "reached25",
        COUNT(*) FILTER (WHERE "maxScrollPct" >= 50)::int as "reached50",
        COUNT(*) FILTER (WHERE "maxScrollPct" >= 75)::int as "reached75",
        COUNT(*) FILTER (WHERE "maxScrollPct" >= 90)::int as "reached100",
        COUNT(DISTINCT "sessionId") FILTER (WHERE "timeSpentSec" < 15)::int as "bouncedSessions",
        MAX("createdAt") as "lastUpdatedAt"
      FROM "WebsiteAnalytics"
      WHERE "createdAt" >= ${cutoff} AND "createdAt" <= ${endCutoff}
      ${brandFilter ? Prisma.sql`AND brand ILIKE ${brandFilter}` : Prisma.empty};
    `,
    prisma.$queryRaw`
      SELECT 
        DATE("createdAt")::text as day,
        COUNT(*)::int as pageviews,
        COUNT(DISTINCT "sessionId")::int as sessions
      FROM "WebsiteAnalytics"
      WHERE "createdAt" >= ${cutoff} AND "createdAt" <= ${endCutoff}
      ${brandFilter ? Prisma.sql`AND brand ILIKE ${brandFilter}` : Prisma.empty}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC;
    `,
    prisma.$queryRaw`
      SELECT 
        COALESCE(brand, 'Other') as brand,
        COUNT(*)::int as pageviews,
        COUNT(DISTINCT "sessionId")::int as sessions,
        ROUND(COALESCE(AVG("timeSpentSec"), 0))::int as "avgTimeSec",
        ROUND(COALESCE(AVG("maxScrollPct"), 0))::int as "avgScrollPct",
        ROUND((COUNT(DISTINCT "sessionId") FILTER (WHERE "timeSpentSec" < 15)::float / GREATEST(COUNT(DISTINCT "sessionId"), 1)) * 100)::float as "bounceRate"
      FROM "WebsiteAnalytics"
      WHERE "createdAt" >= ${cutoff} AND "createdAt" <= ${endCutoff} AND brand IS NOT NULL
      GROUP BY brand
      ORDER BY pageviews DESC;
    `,
    prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN "deviceType" ILIKE '%mobile%' THEN 'Mobile'
          WHEN "deviceType" ILIKE '%tablet%' THEN 'Tablet'
          ELSE 'Desktop' 
        END as device,
        COUNT(DISTINCT "sessionId")::int as sessions,
        ROUND(COALESCE(AVG("timeSpentSec"), 0))::int as "avgTimeSec",
        ROUND(COALESCE(AVG("maxScrollPct"), 0))::int as "avgScrollPct",
        ROUND((COUNT(DISTINCT "sessionId") FILTER (WHERE "timeSpentSec" < 15)::float / GREATEST(COUNT(DISTINCT "sessionId"), 1)) * 100)::float as "bounceRate"
      FROM "WebsiteAnalytics"
      WHERE "createdAt" >= ${cutoff} AND "createdAt" <= ${endCutoff}
      ${brandFilter ? Prisma.sql`AND brand ILIKE ${brandFilter}` : Prisma.empty}
      GROUP BY 1
      ORDER BY sessions DESC;
    `,
    prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN referrer ILIKE '%google%' THEN 'Google Search / Ads'
          WHEN referrer ILIKE '%facebook%' OR referrer ILIKE '%meta%' THEN 'Meta Ads'
          WHEN referrer ILIKE '%instagram%' THEN 'Instagram'
          WHEN referrer ILIKE '%whatsapp%' THEN 'WhatsApp'
          ELSE 'Direct' 
        END as source,
        COUNT(DISTINCT "sessionId")::int as sessions,
        ROUND(COALESCE(AVG("timeSpentSec"), 0))::int as "avgTimeSec",
        ROUND((COUNT(DISTINCT "sessionId") FILTER (WHERE "timeSpentSec" < 15)::float / GREATEST(COUNT(DISTINCT "sessionId"), 1)) * 100)::float as "bounceRate"
      FROM "WebsiteAnalytics"
      WHERE "createdAt" >= ${cutoff} AND "createdAt" <= ${endCutoff}
      ${brandFilter ? Prisma.sql`AND brand ILIKE ${brandFilter}` : Prisma.empty}
      GROUP BY 1
      ORDER BY sessions DESC;
    `,
    prisma.$queryRaw`
      SELECT 
        "pagePath",
        COALESCE("pageTitle", "pagePath") as "pageTitle",
        brand,
        sku,
        COUNT(*)::int as views,
        COUNT(DISTINCT "sessionId")::int as sessions,
        ROUND(COALESCE(AVG("timeSpentSec"), 0))::int as "avgTimeSec",
        ROUND(COALESCE(AVG("maxScrollPct"), 0))::int as "avgScrollPct",
        0 as "totalClicks",
        ROUND((COUNT(DISTINCT "sessionId") FILTER (WHERE "timeSpentSec" < 15)::float / GREATEST(COUNT(DISTINCT "sessionId"), 1)) * 100)::float as "bounceRate"
      FROM "WebsiteAnalytics"
      WHERE "createdAt" >= ${cutoff} AND "createdAt" <= ${endCutoff}
      ${brandFilter ? Prisma.sql`AND brand ILIKE ${brandFilter}` : Prisma.empty}
      GROUP BY "pagePath", "pageTitle", brand, sku
      ORDER BY views DESC
      LIMIT 250;
    `
  ]);

  const ov = overviewRows[0] || {};
  const totalPageviews = Number(ov.totalPageviews || 0);
  const totalSessions = Number(ov.totalSessions || 0);
  const uniqueVisitors = Number(ov.uniqueVisitors || 0);
  const bouncedSessions = Number(ov.bouncedSessions || 0);
  const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 1000) / 10 : 0;
  const pagesPerSession = totalSessions > 0 ? Math.round((totalPageviews / totalSessions) * 100) / 100 : 0;
  const avgSessionDurationSec = Number(ov.avgSessionDurationSec || 0);
  const avgPageTimeSec = avgSessionDurationSec;
  const avgScrollDepthPct = Number(ov.avgScrollDepthPct || 0);
  const engagedSessionsCount = Math.max(0, totalSessions - bouncedSessions);
  const reached25 = Number(ov.reached25 || 0);
  const reached50 = Number(ov.reached50 || 0);
  const reached75 = Number(ov.reached75 || 0);
  const reached100 = Number(ov.reached100 || 0);

  const byBrand: BrandAnalyticsRow[] = brandRows.map((r: any) => ({
    brand: r.brand,
    sessions: Number(r.sessions || 0),
    pageviews: Number(r.pageviews || 0),
    avgTimeSec: Number(r.avgTimeSec || 0),
    avgScrollPct: Number(r.avgScrollPct || 0),
    bounceRate: Number(r.bounceRate || 0),
  }));

  const bySource: SourceAnalyticsRow[] = sourceRows.map((r: any) => ({
    source: r.source,
    sessions: Number(r.sessions || 0),
    sharePct: totalSessions > 0 ? Math.round((Number(r.sessions || 0) / totalSessions) * 100) : 0,
    avgTimeSec: Number(r.avgTimeSec || 0),
    bounceRate: Number(r.bounceRate || 0),
  }));

  const byDevice: DeviceAnalyticsRow[] = deviceRows.map((r: any) => ({
    device: r.device,
    sessions: Number(r.sessions || 0),
    sharePct: totalSessions > 0 ? Math.round((Number(r.sessions || 0) / totalSessions) * 100) : 0,
    avgScrollPct: Number(r.avgScrollPct || 0),
    avgTimeSec: Number(r.avgTimeSec || 0),
    bounceRate: Number(r.bounceRate || 0),
  }));

  const allPages: PageMetricRow[] = pageRows.map((r: any) => ({
    pagePath: r.pagePath,
    pageTitle: r.pageTitle,
    brand: r.brand,
    sku: r.sku,
    views: Number(r.views || 0),
    sessions: Number(r.sessions || 0),
    avgTimeSec: Number(r.avgTimeSec || 0),
    avgScrollPct: Number(r.avgScrollPct || 0),
    bounceRate: Number(r.bounceRate || 0),
    totalClicks: Number(r.totalClicks || 0),
  }));

  // Build continuous 14-day timeline
  const dayMap = new Map<string, { sessions: number; pageviews: number }>();
  for (const r of dailyRows) {
    dayMap.set(r.day, { sessions: Number(r.sessions || 0), pageviews: Number(r.pageviews || 0) });
  }

  const today = new Date();
  const consecutiveDays: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    consecutiveDays.push(d.toISOString().slice(0, 10));
  }

  const dailyTrend: DailyTrafficPoint[] = consecutiveDays.map((date) => {
    const info = dayMap.get(date);
    const dt = new Date(`${date}T00:00:00`);
    const label = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      date,
      label,
      sessions: info ? info.sessions : 0,
      pageviews: info ? info.pageviews : 0,
      bounceRate: 80,
    };
  });

  const finalResult = {
    overview: {
      totalSessions,
      uniqueVisitors,
      totalPageviews,
      pagesPerSession,
      bounceRate,
      avgSessionDurationSec,
      avgPageTimeSec,
      avgScrollDepthPct,
      engagedSessionsCount,
      scrollFunnel: {
        reached25,
        reached50,
        reached75,
        reached100,
        pct25: totalPageviews > 0 ? Math.round((reached25 / totalPageviews) * 100) : 0,
        pct50: totalPageviews > 0 ? Math.round((reached50 / totalPageviews) * 100) : 0,
        pct75: totalPageviews > 0 ? Math.round((reached75 / totalPageviews) * 100) : 0,
        pct100: totalPageviews > 0 ? Math.round((reached100 / totalPageviews) * 100) : 0,
      },
      byBrand,
      bySource,
      byDevice,
      topPages: allPages.slice(0, 10),
      dailyTrend,
      lastUpdatedAt: ov.lastUpdatedAt ? new Date(ov.lastUpdatedAt) : new Date(),
    },
    pagedPages: allPages.slice((page - 1) * pageSize, page * pageSize),
    totalPagesCount: Math.ceil(allPages.length / pageSize),
  };

  analyticsDataCache.set(baseKey, { 
    overview: finalResult.overview,
    allPages,
    expiresAt: now + 600000 
  });
  return finalResult;
}


