import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-webhook-secret",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const count = await prisma.websiteAnalytics.count();
  return NextResponse.json(
    {
      status: "active",
      endpoint: "/api/webhooks/analytics",
      description: "ADuniFY Website Telemetry & Behavior Ingestion Endpoint",
      totalRecords: count,
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : body.events ? body.events : [body];

    for (const item of items) {
      const id = String(item.id || `pv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      const sessionId = String(item.sessionId || item.session_id || id);
      const visitorId = String(item.visitorId || item.visitor_id || sessionId);
      const pagePath = String(item.pagePath || item.page_path || "/");
      const timeSpentSec = Math.max(0, Math.round(Number(item.timeSpentSec ?? item.time_spent_sec ?? 0)));
      const maxScrollPct = Math.max(0, Math.min(100, Math.round(Number(item.maxScrollPct ?? item.max_scroll_pct ?? 0))));
      const clicksCount = Math.max(0, Math.round(Number(item.clicksCount ?? item.clicks_count ?? 0)));

      const existing = await prisma.websiteAnalytics.findUnique({ where: { id } });
      if (existing) {
        await prisma.websiteAnalytics.update({
          where: { id },
          data: {
            timeSpentSec: Math.max(existing.timeSpentSec, timeSpentSec),
            maxScrollPct: Math.max(existing.maxScrollPct, maxScrollPct),
            clicksCount: Math.max(existing.clicksCount, clicksCount),
            isExit: Boolean(item.isExit ?? item.is_exit ?? existing.isExit),
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.websiteAnalytics.create({
          data: {
            id,
            sessionId,
            visitorId,
            pagePath,
            pageTitle: item.pageTitle || item.page_title || null,
            brand: item.brand || null,
            category: item.category || null,
            sku: item.sku || null,
            referrer: item.referrer || "direct",
            utmSource: item.utmSource || item.utm_source || null,
            utmMedium: item.utmMedium || item.utm_medium || null,
            utmCampaign: item.utmCampaign || item.utm_campaign || null,
            deviceType: item.deviceType || item.device_type || "desktop",
            timeSpentSec,
            maxScrollPct,
            clicksCount,
            isExit: Boolean(item.isExit ?? item.is_exit ?? false),
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ ok: true, count: items.length }, { headers: corsHeaders });
  } catch (err) {
    console.error("Webhook analytics ingestion error:", err);
    return NextResponse.json({ error: "Failed to ingest analytics" }, { status: 500, headers: corsHeaders });
  }
}
