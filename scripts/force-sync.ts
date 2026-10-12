import { syncWorker } from '../src/lib/queue/metaWorker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const connections = await prisma.adConnection.findMany({
    where: { isEnabled: true, platform: 'META' }
  });
  
  console.log(`Found ${connections.length} enabled connections to sync...`);
  
  for (const conn of connections) {
    console.log(`\n--- Syncing ${conn.label || conn.platformAccountId} ---`);
    try {
      const job = { data: { connectionId: conn.id } } as any;
      await (syncWorker as any).processFn(job);
      console.log(`✅ Sync complete for ${conn.label}`);
    } catch (e: any) {
      console.error(`❌ Failed to sync ${conn.label}:`, e.message);
    }
  }
}

main().finally(() => {
  prisma.$disconnect();
  process.exit(0);
});
