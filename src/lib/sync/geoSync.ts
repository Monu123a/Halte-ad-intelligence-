import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function runGeoSync(): Promise<{ success: boolean; totalRegions: number; totalSpend: number; totalLeads: number }> {
  const connections = await prisma.adConnection.findMany({
    where: { platform: "META", isEnabled: true, status: "CONNECTED" }
  });

  if (connections.length === 0) {
    return { success: false, totalRegions: 0, totalSpend: 0, totalLeads: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let grandTotalSpend = 0;
  let grandTotalLeads = 0;
  let regionsCount = 0;

  for (const conn of connections) {
    if (!conn.accessTokenEnc) continue;

    try {
      const token = decrypt(conn.accessTokenEnc);
      const url = `https://graph.facebook.com/v19.0/${conn.platformAccountId}/insights?breakdowns=region&fields=spend,impressions,clicks,actions&date_preset=maximum&limit=100&access_token=${encodeURIComponent(token)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        console.warn(`[GeoSync] Failed to fetch geo breakdown for ${conn.label || conn.platformAccountId}:`, data.error.message);
        continue;
      }

      const rows = data.data || [];
      for (const r of rows) {
        if (!r.region) continue;

        let cleanRegion = r.region.trim();
        if (cleanRegion.toLowerCase() === "punjab region") cleanRegion = "Punjab";
        if (cleanRegion.toLowerCase() === "nct of delhi") cleanRegion = "Delhi";

        const spend = parseFloat(r.spend || "0");
        const impressions = parseInt(r.impressions || "0", 10);
        const clicks = parseInt(r.clicks || "0", 10);

        const firstReplies = parseInt(
          r.actions?.find((a: any) => a.action_type === "onsite_conversion.messaging_first_reply")?.value || "0",
          10
        );
        const leads = parseInt(
          r.actions?.find((a: any) => a.action_type.includes("lead"))?.value || "0",
          10
        );
        const conversations = parseInt(
          r.actions?.find((a: any) => a.action_type.includes("messaging_conversation_started"))?.value || "0",
          10
        );

        grandTotalSpend += spend;
        grandTotalLeads += (firstReplies + leads + conversations);
        regionsCount++;

        await prisma.geoMetric.upsert({
          where: {
            adConnectionId_region_date: {
              adConnectionId: conn.id,
              region: cleanRegion,
              date: today
            }
          },
          update: {
            spend,
            impressions,
            clicks,
            firstReplies,
            leads,
            conversations,
            rawResponse: r
          },
          create: {
            adConnectionId: conn.id,
            region: cleanRegion,
            date: today,
            spend,
            impressions,
            clicks,
            firstReplies,
            leads,
            conversations,
            rawResponse: r
          }
        });
      }
    } catch (err: any) {
      console.error(`[GeoSync] Error processing ${conn.label}:`, err.message);
    }
  }

  return {
    success: true,
    totalRegions: regionsCount,
    totalSpend: Math.round(grandTotalSpend),
    totalLeads: grandTotalLeads
  };
}
