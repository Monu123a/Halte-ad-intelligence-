import prisma from "@/lib/prisma";

export async function runWebsiteAnalyticsSync(): Promise<{
  success: boolean;
  syncedCount: number;
  totalRecords: number;
  error?: string;
}> {
  try {
    const halteApiUrl =
      process.env.HALTE_API_URL || "https://halte.in/api/haltedb/analytics?days=7";

    const res = await fetch(halteApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch from Halte API: HTTP ${res.status}`);
    }

    const json = await res.json();
    const rows = json.rows || json.data || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      const total = await prisma.websiteAnalytics.count();
      return { success: true, syncedCount: 0, totalRecords: total };
    }

    let syncedCount = 0;

    for (const r of rows) {
      const id = String(r.id || `pv_${r.session_id}_${Math.random().toString(36).slice(2, 6)}`);
      const sessionId = String(r.sessionId || r.session_id || id);
      const visitorId = String(r.visitorId || r.visitor_id || sessionId);
      const pagePath = String(r.pagePath || r.page_path || "/");
      const timeSpentSec = Math.max(0, Math.round(Number(r.timeSpentSec ?? r.time_spent_sec ?? 0)));
      const maxScrollPct = Math.max(
        0,
        Math.min(100, Math.round(Number(r.maxScrollPct ?? r.max_scroll_pct ?? 0)))
      );
      const clicksCount = Math.max(
        0,
        Math.round(Number(r.clicksCount ?? r.clicks_count ?? 0))
      );
      const isExit = Boolean(r.isExit ?? r.is_exit ?? false);

      const existing = await prisma.websiteAnalytics.findUnique({ where: { id } });

      if (existing) {
        await prisma.websiteAnalytics.update({
          where: { id },
          data: {
            timeSpentSec: Math.max(existing.timeSpentSec, timeSpentSec),
            maxScrollPct: Math.max(existing.maxScrollPct, maxScrollPct),
            clicksCount: Math.max(existing.clicksCount, clicksCount),
            isExit: isExit || existing.isExit,
            updatedAt: new Date(),
          },
        });
        syncedCount++;
      } else {
        await prisma.websiteAnalytics.create({
          data: {
            id,
            sessionId,
            visitorId,
            pagePath,
            pageTitle: r.pageTitle || r.page_title || null,
            brand: r.brand || null,
            category: r.category || null,
            sku: r.sku || null,
            referrer: r.referrer || "direct",
            utmSource: r.utmSource || r.utm_source || null,
            utmMedium: r.utmMedium || r.utm_medium || null,
            utmCampaign: r.utmCampaign || r.utm_campaign || null,
            deviceType: r.deviceType || r.device_type || "desktop",
            timeSpentSec,
            maxScrollPct,
            clicksCount,
            isExit,
            createdAt: r.createdAt ? new Date(r.createdAt) : r.created_at ? new Date(r.created_at) : new Date(),
            updatedAt: new Date(),
          },
        });
        syncedCount++;
      }
    }

    const totalRecords = await prisma.websiteAnalytics.count();
    return { success: true, syncedCount, totalRecords };
  } catch (err: any) {
    console.error("[Website Analytics Sync Error]:", err);
    return {
      success: false,
      syncedCount: 0,
      totalRecords: await prisma.websiteAnalytics.count().catch(() => 0),
      error: err.message,
    };
  }
}
