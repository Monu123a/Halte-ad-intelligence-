import { PrismaClient } from '@prisma/client';
import { decrypt } from '../src/lib/crypto';
const prisma = new PrismaClient();
prisma.adConnection.findUnique({ where: { platformAccountId: 'act_311914471593198' } })
  .then(acc => {
    if (acc) {
      console.log('Status:', acc.status);
      console.log('Token length:', acc.accessTokenEnc ? decrypt(acc.accessTokenEnc).length : 0);
      console.log('Token starts with:', acc.accessTokenEnc ? decrypt(acc.accessTokenEnc).substring(0, 10) : 'N/A');
    } else {
      console.log("Account not found");
    }
  })
  .finally(() => prisma.$disconnect());
