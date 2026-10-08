import { PrismaClient } from '@prisma/client';
import { getOverviewStats } from '../src/lib/services';

const prisma = new PrismaClient();
globalThis.prismaGlobal = prisma; // Provide global prisma for the imported service

async function main() {
  const stats = await getOverviewStats();
  console.log("=== Overview Cards ===");
  console.log("Messaging spend:", stats.messagingSpend);
  console.log("Click & awareness spend:", stats.otherSpend);
  console.log("Genuine leads (messaging):", stats.genuineLeadsCount);
  console.log("Genuine leads (other):", stats.otherGenuineLeadsCount);
  console.log("Cost per genuine lead:", stats.cpgl);
  console.log("Spam rate:", stats.spamRate + "%");
}

main().finally(() => prisma.$disconnect());
