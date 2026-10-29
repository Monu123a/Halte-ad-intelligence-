import prisma from "./prisma";

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

const analyticsDataCache = new Map<string, { data: any; expiresAt: number }>();

export function invalidateAnalyticsCache() {
  analyticsDataCache.clear();
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

  const cacheKey = options.from
    ? `custom_${options.from.toISOString()}_${options.to?.toISOString() || ""}_${brandFilter || "ALL"}_${page}_${pageSize}`
    : `${days}_${brandFilter || "ALL"}_${page}_${pageSize}`;
  const now = Date.now();
  const cached = analyticsDataCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const whereClause: any = {};
  if (options.from) {
    whereClause.createdAt = {
      gte: options.from,
      ...(options.to ? { lte: new Date(new Date(options.to).setHours(23, 59, 59, 999)) } : {})
    };
  } else if (days > 0 && days < 3650) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    whereClause.createdAt = { gte: cutoff };
  }
  if (brandFilter) {
    whereClause.brand = { equals: brandFilter, mode: "insensitive" };
  }

  let rows = await prisma.websiteAnalytics.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 35000,
  });


  // Fallback if date range is narrower than historical records
  if (rows.length === 0 && days < 3650) {
    const fallbackWhere: any = {};
    if (brandFilter) {
      fallbackWhere.brand = { equals: brandFilter, mode: "insensitive" };
    }
    rows = await prisma.websiteAnalytics.findMany({
      where: fallbackWhere,
      orderBy: { createdAt: "desc" },
      take: 35000,
    });
  }

  const totalPageviews = rows.length;
  const lastUpdatedAt = rows.length > 0 ? rows[0].createdAt : null;

  // Group into sessions
  const sessionMap = new Map<
    string,
    {
      sessionId: string;
      visitorId: string;
      views: number;
      totalTimeSec: number;
      maxScrollPct: number;
      totalClicks: number;
      referrer: string;
      deviceType: string;
      brands: Set<string>;
      dateKey: string;
    }
  >();

  const visitorSet = new Set<string>();
  let totalPageTimeSec = 0;
  let totalScrollSum = 0;
  let reached25 = 0;
  let reached50 = 0;
  let reached75 = 0;
  let reached100 = 0;

  for (const r of rows) {
    visitorSet.add(r.visitorId);
    totalPageTimeSec += r.timeSpentSec || 0;
    const sc = r.maxScrollPct || 0;
    totalScrollSum += sc;
    if (sc >= 25) reached25++;
    if (sc >= 50) reached50++;
    if (sc >= 75) reached75++;
    if (sc >= 90) reached100++;

    const dateKey = new Date(r.createdAt).toISOString().slice(0, 10);
    const existing = sessionMap.get(r.sessionId);
    if (!existing) {
      const brands = new Set<string>();
      if (r.brand) brands.add(r.brand);
      sessionMap.set(r.sessionId, {
        sessionId: r.sessionId,
        visitorId: r.visitorId,
        views: 1,
        totalTimeSec: r.timeSpentSec || 0,
        maxScrollPct: sc,
        totalClicks: r.clicksCount || 0,
        referrer: (r.referrer || "direct").toLowerCase(),
        deviceType: (r.deviceType || "desktop").toLowerCase(),
        brands,
        dateKey,
      });
    } else {
      existing.views += 1;
      existing.totalTimeSec += r.timeSpentSec || 0;
      if (sc > existing.maxScrollPct) existing.maxScrollPct = sc;
      existing.totalClicks += r.clicksCount || 0;
      if (r.brand) existing.brands.add(r.brand);
    }
  }

  const sessions = Array.from(sessionMap.values());
  const totalSessions = sessions.length;
  const uniqueVisitors = visitorSet.size;

  // A session is a "bounce" if it only viewed 1 page AND spent < 15 seconds (or 0 clicks and < 20s)
  const isSessionBounce = (s: { views: number; totalTimeSec: number; totalClicks: number }) =>
    s.views === 1 && (s.totalTimeSec < 15 || s.totalClicks === 0);

  let bouncedSessions = 0;
  let totalSessionTimeSec = 0;

  for (const s of sessions) {
    if (isSessionBounce(s)) bouncedSessions++;
    totalSessionTimeSec += s.totalTimeSec;
  }

  const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 1000) / 10 : 0;
  const pagesPerSession = totalSessions > 0 ? Math.round((totalPageviews / totalSessions) * 100) / 100 : 0;
  const avgSessionDurationSec = totalSessions > 0 ? Math.round(totalSessionTimeSec / totalSessions) : 0;
  const avgPageTimeSec = totalPageviews > 0 ? Math.round(totalPageTimeSec / totalPageviews) : 0;
  const avgScrollDepthPct = totalPageviews > 0 ? Math.round(totalScrollSum / totalPageviews) : 0;
  const engagedSessionsCount = Math.max(0, totalSessions - bouncedSessions);

  // Brand breakdown
  const coreBrands = ["Gardena", "BKR", "Gorilla", "Velcro"];
  const brandStatsMap = new Map<
    string,
    {
      pageviews: number;
      timeSum: number;
      scrollSum: number;
      sessionIds: Set<string>;
    }
  >();
  for (const b of coreBrands) {
    brandStatsMap.set(b, { pageviews: 0, timeSum: 0, scrollSum: 0, sessionIds: new Set() });
  }

  for (const r of rows) {
    if (!r.brand) continue;
    const matched = coreBrands.find((b) => b.toLowerCase() === r.brand?.toLowerCase()) || r.brand;
    if (!brandStatsMap.has(matched)) {
      brandStatsMap.set(matched, { pageviews: 0, timeSum: 0, scrollSum: 0, sessionIds: new Set() });
    }
    const st = brandStatsMap.get(matched)!;
    st.pageviews += 1;
    st.timeSum += r.timeSpentSec || 0;
    st.scrollSum += r.maxScrollPct || 0;
    st.sessionIds.add(r.sessionId);
  }

  const byBrand: BrandAnalyticsRow[] = Array.from(brandStatsMap.entries())
    .map(([brand, st]) => {
      const sessList = Array.from(st.sessionIds)
        .map((id) => sessionMap.get(id))
        .filter(Boolean) as typeof sessions;
      const bCount = sessList.filter(isSessionBounce).length;
      const sessCount = sessList.length;
      return {
        brand,
        sessions: sessCount,
        pageviews: st.pageviews,
        avgTimeSec: sessCount > 0 ? Math.round(st.timeSum / sessCount) : 0,
        avgScrollPct: st.pageviews > 0 ? Math.round(st.scrollSum / st.pageviews) : 0,
        bounceRate: sessCount > 0 ? Math.round((bCount / sessCount) * 1000) / 10 : 0,
      };
    })
    .filter((b) => coreBrands.includes(b.brand) || b.pageviews > 0)
    .sort((a, b) => b.pageviews - a.pageviews);

  // Source breakdown
  const sourceGroupMap = new Map<string, typeof sessions>();
  for (const s of sessions) {
    let label = "Direct";
    if (s.referrer.includes("google")) label = "Google Search / Ads";
    else if (s.referrer.includes("meta") || s.referrer.includes("facebook")) label = "Meta Ads";
    else if (s.referrer.includes("instagram")) label = "Instagram";
    else if (s.referrer.includes("whatsapp")) label = "WhatsApp";
    else if (s.referrer !== "direct") label = s.referrer;

    if (!sourceGroupMap.has(label)) sourceGroupMap.set(label, []);
    sourceGroupMap.get(label)!.push(s);
  }

  const bySource: SourceAnalyticsRow[] = Array.from(sourceGroupMap.entries())
    .map(([source, list]) => {
      const bCount = list.filter(isSessionBounce).length;
      const tSum = list.reduce((acc, x) => acc + x.totalTimeSec, 0);
      return {
        source,
        sessions: list.length,
        sharePct: totalSessions > 0 ? Math.round((list.length / totalSessions) * 100) : 0,
        avgTimeSec: list.length > 0 ? Math.round(tSum / list.length) : 0,
        bounceRate: list.length > 0 ? Math.round((bCount / list.length) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  // Device breakdown
  const deviceGroupMap = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const d =
      s.deviceType === "mobile"
        ? "Mobile"
        : s.deviceType === "tablet"
        ? "Tablet"
        : "Desktop";
    if (!deviceGroupMap.has(d)) deviceGroupMap.set(d, []);
    deviceGroupMap.get(d)!.push(s);
  }

  const byDevice: DeviceAnalyticsRow[] = Array.from(deviceGroupMap.entries())
    .map(([device, list]) => {
      const bCount = list.filter(isSessionBounce).length;
      const tSum = list.reduce((acc, x) => acc + x.totalTimeSec, 0);
      const scSum = list.reduce((acc, x) => acc + x.maxScrollPct, 0);
      return {
        device,
        sessions: list.length,
        sharePct: totalSessions > 0 ? Math.round((list.length / totalSessions) * 100) : 0,
        avgScrollPct: list.length > 0 ? Math.round(scSum / list.length) : 0,
        avgTimeSec: list.length > 0 ? Math.round(tSum / list.length) : 0,
        bounceRate: list.length > 0 ? Math.round((bCount / list.length) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  // Page-level aggregation
  const pageAggMap = new Map<
    string,
    {
      pagePath: string;
      pageTitle: string;
      brand: string | null;
      sku: string | null;
      views: number;
      sessionIds: Set<string>;
      timeSum: number;
      scrollSum: number;
      clicksSum: number;
    }
  >();

  for (const r of rows) {
    const key = r.pagePath;
    let entry = pageAggMap.get(key);
    if (!entry) {
      entry = {
        pagePath: r.pagePath,
        pageTitle: r.pageTitle || r.pagePath,
        brand: r.brand || null,
        sku: r.sku || null,
        views: 0,
        sessionIds: new Set(),
        timeSum: 0,
        scrollSum: 0,
        clicksSum: 0,
      };
      pageAggMap.set(key, entry);
    }
    entry.views += 1;
    entry.sessionIds.add(r.sessionId);
    entry.timeSum += r.timeSpentSec || 0;
    entry.scrollSum += r.maxScrollPct || 0;
    entry.clicksSum += r.clicksCount || 0;
  }

  const allPages: PageMetricRow[] = Array.from(pageAggMap.values())
    .map((p) => {
      const sessList = Array.from(p.sessionIds)
        .map((id) => sessionMap.get(id))
        .filter(Boolean) as typeof sessions;
      const bCount = sessList.filter(isSessionBounce).length;
      const sessCount = sessList.length;
      return {
        pagePath: p.pagePath,
        pageTitle: p.pageTitle,
        brand: p.brand,
        sku: p.sku,
        views: p.views,
        sessions: sessCount,
        avgTimeSec: p.views > 0 ? Math.round(p.timeSum / p.views) : 0,
        avgScrollPct: p.views > 0 ? Math.round(p.scrollSum / p.views) : 0,
        bounceRate: sessCount > 0 ? Math.round((bCount / sessCount) * 1000) / 10 : 0,
        totalClicks: p.clicksSum,
      };
    })
    .sort((a, b) => b.views - a.views);

  const totalPagesCount = allPages.length;
  const pagedPages = allPages.slice((page - 1) * pageSize, page * pageSize);

  // Daily trend (last 14 consecutive calendar days, continuous without gaps)
  const dayMap = new Map<string, { sessions: Set<string>; pageviews: number }>();
  for (const r of rows) {
    const dk = new Date(r.createdAt).toISOString().slice(0, 10);
    if (!dayMap.has(dk)) dayMap.set(dk, { sessions: new Set(), pageviews: 0 });
    const d = dayMap.get(dk)!;
    d.sessions.add(r.sessionId);
    d.pageviews += 1;
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

    if (!info) {
      return {
        date,
        label,
        sessions: 0,
        pageviews: 0,
        bounceRate: 0,
      };
    }

    const sessList = Array.from(info.sessions)
      .map((id) => sessionMap.get(id))
      .filter(Boolean) as typeof sessions;
    const bCount = sessList.filter(isSessionBounce).length;

    return {
      date,
      label,
      sessions: info.sessions.size,
      pageviews: info.pageviews,
      bounceRate: sessList.length > 0 ? Math.round((bCount / sessList.length) * 100) : 0,
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
      lastUpdatedAt,
    },
    pagedPages,
    totalPagesCount,
  };

  analyticsDataCache.set(cacheKey, { data: finalResult, expiresAt: now + 60000 });
  return finalResult;
}


