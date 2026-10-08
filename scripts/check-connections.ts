import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const connections = await prisma.adConnection.findMany();
  for (const c of connections) {
    console.log(c.platformAccountId, c.status, c.label, c.accessTokenEnc.substring(0, 20) + '...');
  }
}
main().finally(() => prisma.$disconnect());
