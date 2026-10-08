import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(isDryRun ? "Starting demo data cleanup [DRY RUN]..." : "Starting demo data cleanup...");

  // 1. Find all demo AdSets
  const demoAdSets = await prisma.adSet.findMany({
    where: { platformAdSetId: { startsWith: 'demo_' } },
    select: { id: true }
  });
  const demoAdSetIds = demoAdSets.map(a => a.id);

  // 2. Count things to delete
  const leadsCount = await prisma.lead.count({ where: { adSetId: { in: demoAdSetIds } } });
  const metricsCount = await prisma.dailyMetric.count({ where: { adSetId: { in: demoAdSetIds } } });
  const adSetsCount = demoAdSets.length;
  const campaignsCount = await prisma.campaign.count({ where: { platformCampaignId: { startsWith: 'demo_' } } });
  
  const brands = await prisma.brand.findMany({
    where: { pageId: { startsWith: 'demo_page_' } }
  });

  if (isDryRun) {
    console.log(`[DRY RUN] Would delete ${leadsCount} demo Leads`);
    console.log(`[DRY RUN] Would delete ${metricsCount} demo DailyMetrics`);
    console.log(`[DRY RUN] Would delete ${adSetsCount} demo AdSets`);
    console.log(`[DRY RUN] Would delete ${campaignsCount} demo Campaigns`);
    console.log(`[DRY RUN] Would update ${brands.length} demo Brand Page IDs`);
    console.log("Dry run complete. No changes made.");
    return;
  }

  // Real run in a transaction
  await prisma.$transaction(async (tx) => {
    if (demoAdSetIds.length > 0) {
      await tx.lead.deleteMany({ where: { adSetId: { in: demoAdSetIds } } });
      console.log(`Deleted ${leadsCount} demo Leads`);

      await tx.dailyMetric.deleteMany({ where: { adSetId: { in: demoAdSetIds } } });
      console.log(`Deleted ${metricsCount} demo DailyMetrics`);

      await tx.adSet.deleteMany({ where: { platformAdSetId: { startsWith: 'demo_' } } });
      console.log(`Deleted ${adSetsCount} demo AdSets`);
    }

    await tx.campaign.deleteMany({ where: { platformCampaignId: { startsWith: 'demo_' } } });
    console.log(`Deleted ${campaignsCount} demo Campaigns`);

    for (const brand of brands) {
      const newPageId = brand.pageId.replace('demo_page_', 'pending_real_page_');
      await tx.brand.update({
        where: { id: brand.id },
        data: { pageId: newPageId }
      });
      console.log(`Updated Brand ${brand.name} pageId to ${newPageId}`);
    }
  });

  console.log("Cleanup complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
