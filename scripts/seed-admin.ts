import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@halte.in";
  const password = "password123";
  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists.");
    return;
  }
  
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN"
    }
  });
  
  console.log("Admin created: admin@halte.in / password123");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
