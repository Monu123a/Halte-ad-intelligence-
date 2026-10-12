import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Token
  const conn = await prisma.adConnection.findFirst();
  console.log("Token Expires At:", conn?.tokenExpiresAt);

  // Campaign count and spend
  const campaigns = await prisma.campaign.count();
  const metrics = await prisma.dailyMetric.aggregate({
    _sum: { spend: true }
  });
  console.log("Total Campaigns:", campaigns);
  console.log("Total Spend:", metrics._sum.spend);

  // Brand Mapping
  const mapped = await prisma.campaign.groupBy({
    by: ['brandPageId'],
    _count: { _all: true }
  });
  console.log("Brand Mapping:", mapped);

  // Row Counts
  const sh = await prisma.salesHistory.count();
  const sr = await prisma.seasonalRule.count();
  const poi = await prisma.productOpportunityInsights.count();
  console.log("SalesHistory:", sh, "SeasonalRule:", sr, "POI:", poi);

  // Demo Rows
  const demoLeads = await prisma.lead.count({ where: { id: { startsWith: 'demo_' } } });
  const demoDm = await prisma.dailyMetric.count({ where: { id: { startsWith: 'demo_' } } });
  const demoAdset = await prisma.adSet.count({ where: { id: { startsWith: 'demo_' } } });
  const demoCamp = await prisma.campaign.count({ where: { id: { startsWith: 'demo_' } } });
  console.log("Demo Rows (Lead/DM/AdSet/Camp):", demoLeads, demoDm, demoAdset, demoCamp);
  
  // 20 examples
  const examples = await prisma.campaign.findMany({
    where: { brandPageId: { not: null } },
    take: 20,
    select: { name: true, brandPageId: true }
  });
  console.log("Examples mapped:", examples);
}
main().finally(() => process.exit(0));
