import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
Promise.all([
  prisma.salesHistory.count(),
  prisma.seasonalRule.count(),
  prisma.productOpportunityInsights.count()
]).then(counts => {
  console.log('SalesHistory:', counts[0]);
  console.log('SeasonalRule:', counts[1]);
  console.log('ProductOpportunityInsights:', counts[2]);
}).finally(() => prisma.$disconnect());
