import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runGoogleSync } from "@/lib/sync/googleSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const googleConns = await prisma.adConnection.findMany({
      where: { platform: "GOOGLE", isEnabled: true },
    });

    if (googleConns.length === 0) {
      return NextResponse.json(
        { success: false, error: "No enabled Google Ads connections found." },
        { status: 404 }
      );
    }

    const syncResults = [];
    for (const conn of googleConns) {
      await runGoogleSync(conn.id, 30);
      syncResults.push({ id: conn.id, accountId: conn.platformAccountId, label: conn.label });
    }

    const latestMetric = await prisma.dailyMetric.findFirst({
      where: { adSet: { campaign: { adConnection: { platform: "GOOGLE" } } } },
      orderBy: { date: "desc" },
      select: { date: true, spend: true, impressions: true, clicks: true },
    });

    const updatedConn = await prisma.adConnection.findFirst({
      where: { platform: "GOOGLE", isEnabled: true },
      select: { lastSyncedAt: true, status: true },
    });

    return NextResponse.json({
      success: true,
      syncedAccounts: syncResults,
      dataThroughDate: latestMetric?.date || null,
      lastSyncedAt: updatedConn?.lastSyncedAt || new Date(),
      status: updatedConn?.status || "CONNECTED",
    });
  } catch (error: any) {
    console.error("[Manual Google Sync Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync Google Ads" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
