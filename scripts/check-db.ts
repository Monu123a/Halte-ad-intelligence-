import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const brandCount = await prisma.brand.count();
  const campaignCount = await prisma.campaign.count();
  const dailyMetricCount = await prisma.dailyMetric.count();
  const leadCount = await prisma.lead.count();

  console.log(`Brands: ${brandCount}`);
  console.log(`Campaigns: ${campaignCount}`);
  console.log(`Daily Metrics: ${dailyMetricCount}`);
  console.log(`Leads: ${leadCount}`);
}

main().finally(() => prisma.$disconnect());
