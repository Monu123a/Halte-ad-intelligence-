import fs from "fs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { GoogleAdsConnector } from "@/lib/connector/google";
import { encrypt } from "@/lib/crypto";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "MASTER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/connections?error=NoCode", req.url));
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const connector = new GoogleAdsConnector(redirectUri);
  try {
    const { accessToken, refreshToken, expiresAt } = await connector.connect(code);
    const encryptedToken = encrypt(accessToken);
    const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

    // Fetch ad accounts to save connections
    try { fs.writeFileSync(".last_google_token", accessToken); } catch {}
    const accounts = await connector.fetchAdAccounts(accessToken);
    
    for (const acc of accounts) {
      await prisma.adConnection.upsert({
        where: { platformAccountId: acc.id },
        update: {
          accessTokenEnc: encryptedToken,
          refreshTokenEnc: encryptedRefresh || undefined,
          tokenExpiresAt: expiresAt,
          status: "CONNECTED",
          label: acc.name,
          metadata: acc.metadata ? JSON.stringify(acc.metadata) : null
        },
        create: {
          platform: "GOOGLE",
          platformAccountId: acc.id,
          accessTokenEnc: encryptedToken,
          refreshTokenEnc: encryptedRefresh,
          tokenExpiresAt: expiresAt,
          status: "CONNECTED",
          isEnabled: false, // Default false until user wants to sync it
          label: acc.name,
          metadata: acc.metadata ? JSON.stringify(acc.metadata) : null
        }
      });
    }

    return NextResponse.redirect(new URL("/connections", req.url));
  } catch (error: any) {
    console.error("Google Auth Error:", error);
    return NextResponse.redirect(new URL("/connections?error=GoogleAuthFailed", req.url));
  }
}
