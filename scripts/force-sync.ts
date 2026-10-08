import { syncWorker } from '../src/lib/queue/metaWorker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const conn = await prisma.adConnection.findUnique({
    where: { platformAccountId: 'act_311914471593198' }
  });
  
  if (!conn) throw new Error("Connection not found");
  
  console.log(`Forcing sync for connection ID: ${conn.id}...`);
  
  // Fake a BullMQ job object
  const job = { data: { connectionId: conn.id } } as any;
  
  await (syncWorker as any).processFn(job);
  console.log("Sync complete!");
}

main().finally(() => {
  prisma.$disconnect();
  process.exit(0);
});
