import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runMetaSync } from "@/lib/sync/metaSync";
import { runGoogleSync } from "@/lib/sync/googleSync";
import { runWebsiteAnalyticsSync } from "@/lib/sync/websiteAnalyticsSync";
import { runGeoSync } from "@/lib/sync/geoSync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Verify authorization if CRON_SECRET is set in Vercel
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connections = await prisma.adConnection.findMany({
      where: { isEnabled: true, status: "CONNECTED" }
    });

    const results: any[] = [];
    for (const conn of connections) {
      try {
        if (conn.platform === "META") {
          await runMetaSync(conn.id);
          results.push({ id: conn.id, platform: "META", label: conn.label, status: "success" });
        } else if (conn.platform === "GOOGLE") {
          await runGoogleSync(conn.id);
          results.push({ id: conn.id, platform: "GOOGLE", label: conn.label, status: "success" });
        }
      } catch (err: any) {
        console.error(`[Cron Sync Error] ${conn.platform} ${conn.id}:`, err);
        results.push({ id: conn.id, platform: conn.platform, label: conn.label, status: "error", error: err.message });
      }
    }
    
    // Sync Halte website telemetry (bounce rate, time spent, scroll depth)
    const webSync = await runWebsiteAnalyticsSync();

    // Sync Geographical Intelligence Performance across all accounts
    let geoSyncResult: any = null;
    try {
      geoSyncResult = await runGeoSync();
    } catch (e: any) {
      console.warn("[Cron Sync] GeoSync warning:", e.message);
    }

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      totalConnections: connections.length,
      websiteTelemetrySync: webSync,
      geoSync: geoSyncResult,
      results
    });
  } catch (error: any) {
    console.error("[Cron Handler Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
