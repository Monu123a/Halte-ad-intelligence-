import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.campaign.updateMany({
    where: { product: "Sprinklers" },
    data: { product: "Watering (sprinklers etc.)" }
  });
  await prisma.campaign.updateMany({
    where: { product: "Fogging Machine" },
    data: { product: "Fogging M/C" }
  });
  console.log("Demo campaigns updated to match exact seasonal rule names.");
}

main().finally(() => prisma.$disconnect());
