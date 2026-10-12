import { PrismaClient } from "@prisma/client";
import { decrypt } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  const conn = await prisma.adConnection.findFirst({ where: { platform: 'META' } });
  if (!conn) throw new Error("No connection");
  
  const token = decrypt(conn.accessTokenEnc);
  
  console.log("\n--- TOKEN DEBUG ---");
  const debugUrl = `https://graph.facebook.com/v19.0/debug_token?input_token=${token}&access_token=${token}`;
  const debugRes = await fetch(debugUrl);
  const debugData = await debugRes.json();
  if (debugData.error) {
    console.log("Debug Error:", debugData.error.message);
  } else {
    console.log("Token Type:", debugData.data?.type);
    console.log("Expires At:", debugData.data?.expires_at ? new Date(debugData.data.expires_at * 1000).toISOString() : 'Never');
    console.log("Is Valid:", debugData.data?.is_valid);
  }

  console.log("\n--- CAMPAIGN STATUS & ERRORS ---");
  const accountIdStr = conn.platformAccountId.startsWith('act_') ? conn.platformAccountId : `act_${conn.platformAccountId}`;
  const url = `https://graph.facebook.com/v19.0/${accountIdStr}/campaigns?fields=id,effective_status&limit=500&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.error) {
    console.log("Graph API Error:", data.error.message);
  } else {
    const statusCounts: Record<string, number> = {};
    for (const c of data.data || []) {
      statusCounts[c.effective_status] = (statusCounts[c.effective_status] || 0) + 1;
    }
    console.log("Statuses:", statusCounts);
  }

  console.log("\n--- 15 BIGGEST UNMAPPED CAMPAIGNS ---");
  const unmapped = await prisma.dailyMetric.groupBy({
    by: ['adSetId'],
    where: { adSet: { campaign: { brandPageId: null } } },
    _sum: { spend: true }
  });
  
  const adSetMap = new Map(unmapped.map(u => [u.adSetId, Number(u._sum.spend)]));
  
  const campaigns = await prisma.campaign.findMany({
    where: { brandPageId: null },
    include: { adSets: true }
  });
  
  const campSpend = campaigns.map(c => {
    const spend = c.adSets.reduce((acc, adSet) => acc + (adSetMap.get(adSet.id) || 0), 0);
    return { name: c.name, spend };
  });
  
  campSpend.sort((a, b) => b.spend - a.spend);
  const top15 = campSpend.slice(0, 15);
  
  top15.forEach((c, i) => console.log(`${i+1}. ${c.name} (₹${c.spend.toFixed(2)})`));
}

main().finally(() => process.exit(0));
