import { PrismaClient } from "@prisma/client";
import { decrypt } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("--- 1. DEMO COUNTS ---");
  const demoCamps = await prisma.campaign.findMany({ where: { platformCampaignId: { startsWith: 'demo_' } } });
  const demoAdsets = await prisma.adSet.findMany({ where: { platformAdSetId: { startsWith: 'demo_' } } });
  
  const demoAdsetIds = demoAdsets.map(a => a.id);
  const demoLeads = demoAdsetIds.length > 0 ? await prisma.lead.count({ where: { adSetId: { in: demoAdsetIds } } }) : 0;
  const demoDms = demoAdsetIds.length > 0 ? await prisma.dailyMetric.count({ where: { adSetId: { in: demoAdsetIds } } }) : 0;
  
  console.log(`Demo Campaigns: ${demoCamps.length}`);
  console.log(`Demo AdSets: ${demoAdsets.length}`);
  console.log(`Demo Leads linked: ${demoLeads}`);
  console.log(`Demo DailyMetrics linked: ${demoDms}`);

  console.log("\n--- 2. META GRAPH API (STATUS & SPEND) ---");
  const conn = await prisma.adConnection.findFirst({ where: { platform: 'META' } });
  if (!conn) throw new Error("No Meta connection found");
  
  const token = decrypt(conn.accessTokenEnc);
  const url = `https://graph.facebook.com/v19.0/${conn.platformAccountId}/campaigns?fields=id,effective_status&limit=500&access_token=${token}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  const statusCounts: Record<string, number> = {};
  const activeIds = new Set<string>();
  const archivedIds = new Set<string>();
  
  if (data.data) {
    for (const c of data.data) {
      statusCounts[c.effective_status] = (statusCounts[c.effective_status] || 0) + 1;
      if (c.effective_status === 'ARCHIVED') archivedIds.add(c.id);
      else activeIds.add(c.id);
    }
  }
  console.log("Graph API Campaign Statuses:", statusCounts);

  // Spend with and without archived
  const allSpend = await prisma.dailyMetric.aggregate({ _sum: { spend: true } });
  
  // Find adsets that belong to archived campaigns
  const archivedAdsets = await prisma.adSet.findMany({
    where: { campaign: { platformCampaignId: { in: Array.from(archivedIds) } } },
    select: { id: true }
  });
  
  const archivedSpend = archivedAdsets.length > 0 ? await prisma.dailyMetric.aggregate({
    where: { adSetId: { in: archivedAdsets.map(a => a.id) } },
    _sum: { spend: true }
  }) : { _sum: { spend: 0 } };
  
  const total = Number(allSpend._sum.spend || 0);
  const arch = Number(archivedSpend._sum.spend || 0);
  console.log(`Total 12mo Spend (All): ₹${total}`);
  console.log(`Total 12mo Spend (Excluding ARCHIVED): ₹${total - arch}`);

  console.log("\n--- 3. BRAND MAPPING & EXAMPLES ---");
  const brands = await prisma.brand.findMany();
  
  for (const b of brands) {
    const count = await prisma.campaign.count({ where: { brandPageId: b.pageId } });
    const spend = await prisma.dailyMetric.aggregate({
      where: { adSet: { campaign: { brandPageId: b.pageId } } },
      _sum: { spend: true }
    });
    console.log(`Brand: ${b.name} | Campaigns: ${count} | Spend: ₹${Number(spend._sum.spend || 0)}`);
  }
  
  const unmappedCount = await prisma.campaign.count({ where: { brandPageId: null } });
  const unmappedSpend = await prisma.dailyMetric.aggregate({
    where: { adSet: { campaign: { brandPageId: null } } },
    _sum: { spend: true }
  });
  console.log(`UNMAPPED | Campaigns: ${unmappedCount} | Spend: ₹${Number(unmappedSpend._sum.spend || 0)}`);

  console.log("\n--- 20 EXAMPLES ---");
  const examples = await prisma.campaign.findMany({
    where: { brandPageId: { not: null } },
    take: 20,
    include: { brand: true }
  });
  
  examples.forEach(e => {
    // Determine the rule used based on logic in metaWorker
    let rule = "Unknown";
    if (e.pageId === e.brandPageId) {
      rule = "Exact Page ID match";
    } else {
      rule = "Caption/Name Keyword match";
    }
    
    // Check for shared-brand campaigns (e.g. name contains both)
    const nameLow = e.name.toLowerCase();
    const isShared = (nameLow.includes("gorilla") && nameLow.includes("velcro")) || 
                     (nameLow.includes("bkr") && nameLow.includes("gardena"));
    
    console.log(`- [${e.brand?.name}] ${e.name} (Rule: ${rule}) ${isShared ? "[SHARED BRAND CAMPAIGN]" : ""}`);
  });
}

main().finally(() => process.exit(0));
