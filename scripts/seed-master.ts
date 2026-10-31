import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "harsh@ahlawat.in";
  const password = "ahlawat01";
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "MASTER"
    },
    create: {
      email,
      passwordHash,
      role: "MASTER"
    }
  });

  // Ensure admin@halte.in is standard ADMIN without Master privileges
  await prisma.user.updateMany({
    where: { email: "admin@halte.in" },
    data: { role: "ADMIN" }
  });

  console.log(`Master account configured: ${user.email} (Role: ${user.role})`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
