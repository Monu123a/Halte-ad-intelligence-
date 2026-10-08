import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  const encToken = encrypt("demo_placeholder_not_a_real_token");

  const accounts = [
    { id: "act_311914471593198", label: "Halte India Main", isEnabled: true },
    { id: "act_104225649910366", label: "Raman Singal", isEnabled: false },
    { id: "act_1404367169791576", label: "Jagan Hardware", isEnabled: false },
    { id: "act_1102132275618034", label: "1102132275618034", isEnabled: false },
  ];

  for (const acc of accounts) {
    await prisma.adConnection.upsert({
      where: { platformAccountId: acc.id },
      update: { label: acc.label, isEnabled: acc.isEnabled }, // Do not overwrite status!
      create: {
        platform: "META",
        platformAccountId: acc.id,
        label: acc.label,
        accessTokenEnc: encToken,
        isEnabled: acc.isEnabled,
        status: "PENDING"
      }
    });
  }

  console.log("Accounts seeded/fixed.");
}

main().finally(() => prisma.$disconnect());
