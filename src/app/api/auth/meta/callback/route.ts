import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { MetaAdsConnector } from "@/lib/connector/meta";
import { encrypt } from "@/lib/crypto";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    console.error("Meta OAuth error:", error, errorDescription);
    return NextResponse.redirect(new URL(`/connections?error=${encodeURIComponent(errorDescription || error)}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/connections?error=NoCode", req.url));
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const protocol = host.includes("localhost") ? "http" : "https";
  const dynamicRedirectUri = `${protocol}://${host}/api/auth/meta/callback`;

  const connector = new MetaAdsConnector(dynamicRedirectUri);
  try {
    const { accessToken, expiresAt } = await connector.connect(code);
    const encryptedToken = encrypt(accessToken);

    // Fetch ad accounts to save connections
    const accounts = await connector.fetchAdAccounts(accessToken);
    
    for (const acc of accounts) {
      await prisma.adConnection.upsert({
        where: { platformAccountId: acc.id },
        update: {
          accessTokenEnc: encryptedToken,
          tokenExpiresAt: expiresAt,
          status: "CONNECTED",
          label: acc.name
        },
        create: {
          platform: "META",
          platformAccountId: acc.id,
          accessTokenEnc: encryptedToken,
          tokenExpiresAt: expiresAt,
          status: "CONNECTED",
          label: acc.name
        }
      });
    }

    return NextResponse.redirect(new URL("/connections", req.url));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/connections?error=AuthFailed", req.url));
  }
}
