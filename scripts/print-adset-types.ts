import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const combinations = await prisma.adSet.groupBy({
    by: ['optimizationGoal', 'destinationType', 'campaignId'],
    _count: { _all: true }
  });

  // We need to fetch campaign objectives separately because groupBy can't traverse relations easily.
  // We'll map them in memory.
  const campaignIds = combinations.map(c => c.campaignId);
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, objective: true }
  });
  
  const campaignObjMap = new Map(campaigns.map(c => [c.id, c.objective]));

  // Aggregate by objective, optGoal, destType
  const summaryMap = new Map<string, number>();

  for (const c of combinations) {
    const obj = campaignObjMap.get(c.campaignId) || "UNKNOWN";
    const key = JSON.stringify({
      objective: obj,
      optimizationGoal: c.optimizationGoal || null,
      destinationType: c.destinationType || null
    });
    const current = summaryMap.get(key) || 0;
    summaryMap.set(key, current + c._count._all);
  }

  console.log("=== Distinct Ad Set Goal Combinations ===");
  for (const [key, count] of summaryMap.entries()) {
    const parsed = JSON.parse(key);
    console.log(`Count: ${count}`);
    console.log(`  Objective: ${parsed.objective}`);
    console.log(`  Optimization Goal: ${parsed.optimizationGoal}`);
    console.log(`  Destination Type: ${parsed.destinationType}`);
    console.log("-----------------------------------------");
  }
}

main().finally(() => prisma.$disconnect());
