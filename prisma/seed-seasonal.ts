import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const data = [
  { product: "Snow Chains", validMonths: [10, 11, 12] },
  { product: "BBQ", validMonths: allMonths },
  { product: "Garden Machinery", validMonths: [6, 7, 8, 9] },
  { product: "Waterproof Tape", validMonths: [6, 7, 8, 9] },
  { product: "Watering (sprinklers etc.)", validMonths: [3, 4, 5, 6] },
  { product: "Leaf Blowers", validMonths: [2, 3, 4] },
  { product: "Firepit", validMonths: [11, 12, 1] },
  { product: "Fogging M/C", validMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { product: "Gensets", validMonths: [5, 6, 7, 8] },
  { product: "Chainsaw", validMonths: [10, 11, 12, 1, 2, 3] },
  { product: "Lawn Mowers", validMonths: [3, 4, 5, 6, 7, 8, 9, 10] },
  { product: "Brush Cutters", validMonths: [7, 8, 9] },
  { product: "Trimmers", validMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { product: "Pole Pruners", validMonths: allMonths },
  { product: "Tillers", validMonths: [9, 10, 11, 12, 1] },
  { product: "Portable Sprayers", validMonths: allMonths },
  { product: "Earth Auger", validMonths: [1, 2, 3] },
];

async function main() {
  await prisma.seasonalRule.deleteMany({}); // wipe existing
  
  for (const item of data) {
    await prisma.seasonalRule.create({
      data: {
        product: item.product,
        validRegions: ["All India"],
        validMonths: item.validMonths,
      }
    });
  }
  
  console.log(`Seeded ${data.length} seasonal rules.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
