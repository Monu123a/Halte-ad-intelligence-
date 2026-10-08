import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const total = await prisma.salesHistory.count();
  const matched = await prisma.salesHistory.count({ where: { subCategory: { not: null } } });
  console.log(`Total: ${total}, Matched: ${matched}`);
}
main().finally(() => prisma.$disconnect());
