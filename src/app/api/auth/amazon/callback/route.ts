import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connector/registry";
import { AmazonAdsConnector } from "@/lib/connector/amazon";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  
  if (!code) {
    return NextResponse.redirect(new URL("/connections?error=AmazonNoCode", req.url));
  }

  try {
    const redirectUri = `${url.origin}/api/auth/amazon/callback`;
    const connector = new AmazonAdsConnector(redirectUri);
    const { accessToken, refreshToken, expiresAt } = await connector.connect(code);
    
    const encryptedToken = encrypt(accessToken);
    const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

    // In Amazon, we list "Profiles" (equivalent to Ad Accounts)
    const accounts = await connector.fetchAdAccounts(accessToken);

    for (const acc of accounts) {
      await prisma.adConnection.upsert({
        where: { platformAccountId: acc.id },
        update: {
          accessTokenEnc: encryptedToken,
          refreshTokenEnc: encryptedRefresh,
          tokenExpiresAt: expiresAt,
          status: "CONNECTED",
          isEnabled: true,
          platform: "AMAZON",
          label: acc.name,
          metadata: acc.metadata ? JSON.stringify(acc.metadata) : null
        },
        create: {
          platformAccountId: acc.id,
          label: acc.name,
          platform: "AMAZON",
          accessTokenEnc: encryptedToken,
          refreshTokenEnc: encryptedRefresh,
          tokenExpiresAt: expiresAt,
          status: "CONNECTED",
          isEnabled: true,
          metadata: acc.metadata ? JSON.stringify(acc.metadata) : null
        }
      });
    }

    return NextResponse.redirect(new URL("/connections", req.url));
  } catch (error) {
    console.error("Amazon Auth Error:", error);
    return NextResponse.redirect(new URL("/connections?error=AmazonAuthFailed", req.url));
  }
}
