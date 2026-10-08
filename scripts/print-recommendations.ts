import { PrismaClient } from '@prisma/client';
import { getDashboardRecommendations } from '../src/lib/services';

const prisma = new PrismaClient();
globalThis.prismaGlobal = prisma; // Provide global prisma for the imported service

async function main() {
  const recommendations = await getDashboardRecommendations();
  const targetNames = ['Hose Reels — Static — Profile Visit', 'Mounting Tape — Reel — Broad', 'Cord Organiser — Static — Profile Visit'];
  
  const adSets = await prisma.adSet.findMany({
    where: { name: { in: targetNames } }
  });
  const adSetMap = new Map(adSets.map(a => [a.id, a.name]));

  console.log("=== Target Recommendations ===");
  for (const rec of recommendations) {
    const adSetName = adSetMap.get(rec.adSetId);
    if (adSetName) {
      console.log(`Ad Set: ${adSetName}`);
      console.log(`  Action: ${rec.action}`);
      console.log(`  Reason: ${rec.reason}`);
      console.log("-----------------------");
    }
  }
}

main().finally(() => prisma.$disconnect());
