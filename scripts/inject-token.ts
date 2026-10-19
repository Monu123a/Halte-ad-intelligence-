import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  const token = process.argv[2]?.trim();
  if (!token) {
    console.error("Usage: npx tsx scripts/inject-token.ts <YOUR_ACCESS_TOKEN>");
    process.exit(1);
  }

  console.log("Validating token and fetching Ad Accounts from Meta...");
  const res = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&limit=100&access_token=${encodeURIComponent(token)}`);
  const data = await res.json();

  if (data.error) {
    console.error("Meta API Error:", data.error.message);
    process.exit(1);
  }

  const accounts = data.data || [];
  console.log(`Found ${accounts.length} ad accounts attached to this token:`);

  const encryptedToken = encrypt(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 60);

  for (const acc of accounts) {
    console.log(`- ${acc.name || "Unnamed Account"} (${acc.id})`);

    await prisma.adConnection.upsert({
      where: { platformAccountId: acc.id },
      update: {
        accessTokenEnc: encryptedToken,
        tokenExpiresAt: expiresAt,
        status: "CONNECTED",
        isEnabled: true,
        label: acc.name || `Account ${acc.id}`
      },
      create: {
        platform: "META",
        platformAccountId: acc.id,
        accessTokenEnc: encryptedToken,
        tokenExpiresAt: expiresAt,
        status: "CONNECTED",
        isEnabled: true,
        label: acc.name || `Account ${acc.id}`
      }
    });
  }

  console.log("Successfully connected and saved all ad accounts in the database!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
