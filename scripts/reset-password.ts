import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.update({
    where: { email: "admin@halte.in" },
    data: { passwordHash: hash }
  });
  console.log("Password reset to: admin123");
}
main().finally(() => process.exit(0));
