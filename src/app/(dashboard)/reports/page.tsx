import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

let cachedReportsKpis: { data: any; expiresAt: number } | null = null;

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Lead Taggers are restricted solely to the Lead Tagging module
  if (session.role === "LEAD_TAGGER") {
    redirect("/leads");
  }

  const now = Date.now();
  let initialKpis = cachedReportsKpis && now < cachedReportsKpis.expiresAt
    ? cachedReportsKpis.data
    : null;

  if (!initialKpis) {
    // Fetch initial summary metrics in parallel
    const [
      totalCampaigns,
      totalAdSets,
      dailyMetricsSum,
      totalGeoMetrics,
      totalLeads,
      genuineLeadsCount,
      webAnalyticsCount,
      brands
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.adSet.count(),
      prisma.dailyMetric.aggregate({
        _sum: { spend: true, impressions: true, clicks: true }
      }),
      prisma.geoMetric.count(),
      prisma.lead.count(),
      prisma.lead.count({ where: { tag: { in: ["GENUINE", "CONVERTED"] } } }),
      prisma.websiteAnalytics.count(),
      prisma.brand.findMany({ select: { name: true } })
    ]);

    initialKpis = {
      totalCampaigns,
      totalAdSets,
      totalSpend: Math.round(Number(dailyMetricsSum._sum.spend || 0)),
      totalImpressions: dailyMetricsSum._sum.impressions || 0,
      totalClicks: dailyMetricsSum._sum.clicks || 0,
      totalGeoRegions: totalGeoMetrics,
      totalLeads,
      genuineLeadsCount,
      webAnalyticsCount,
      brands: brands.map(b => b.name)
    };

    cachedReportsKpis = { data: initialKpis, expiresAt: now + 300000 }; // 5 min cache
  }

  return <ReportsClient initialKpis={initialKpis} userRole={session.role} />;
}
