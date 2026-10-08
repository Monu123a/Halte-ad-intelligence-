import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const records = await prisma.salesHistory.findMany({
    where: { subCategory: "Snow Chain" } // Wait, the rule is "Snow Chains", but what is the master product category? Let's check both
  });

  if (records.length === 0) {
    // try "Snow Chains"
    const records2 = await prisma.salesHistory.findMany({
      where: { subCategory: "Snow Chains" }
    });
    if (records2.length > 0) {
      records.push(...records2);
    }
  }

  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
  console.log(`Total Quantity: ${totalQuantity} (Rows: ${records.length})`);

  const monthCounts = new Array(12).fill(0);
  const stateCounts: Record<string, number> = {};

  for (const r of records) {
    const m = r.orderDate.getMonth();
    monthCounts[m] += r.quantity;

    let state = r.shipToState || "UNKNOWN";
    state = state.trim().toUpperCase();
    stateCounts[state] = (stateCounts[state] || 0) + r.quantity;
  }

  console.log("\n--- MONTHLY DISTRIBUTION ---");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < 12; i++) {
    const pct = ((monthCounts[i] / totalQuantity) * 100).toFixed(1);
    console.log(`${monthNames[i]}: ${pct}% (${monthCounts[i]})`);
  }

  console.log("\n--- TOP 5 STATES ---");
  const sortedStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < Math.min(10, sortedStates.length); i++) {
    const [state, qty] = sortedStates[i];
    const pct = ((qty / totalQuantity) * 100).toFixed(1);
    console.log(`${state}: ${pct}% (${qty})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
