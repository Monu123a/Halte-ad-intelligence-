import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.adConnection.updateMany({
    data: { isEnabled: true, status: "ERROR" }
  });
  console.log("All accounts enabled and marked as ERROR to trigger Reconnect.");
}
main().finally(() => process.exit(0));
