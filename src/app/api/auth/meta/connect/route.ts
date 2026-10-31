import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { MetaAdsConnector } from "@/lib/connector/meta";

export async function GET(req: Request) {
  const session = await getSession();
  
  if (!session || (session.role !== "ADMIN" && session.role !== "MASTER")) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
  }

  const urlObj = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || urlObj.host;
  const protocol = host.includes("localhost") ? "http" : "https";
  const dynamicRedirectUri = `${protocol}://${host}/api/auth/meta/callback`;

  const connector = new MetaAdsConnector(dynamicRedirectUri);
  const appId = connector.getAppId();

  if (!appId || !/^\d+$/.test(appId) || appId.length < 10) {
    console.error(`Invalid META_APP_ID configured: "${appId}"`);
    return NextResponse.redirect(new URL(`/connections?error=InvalidAppId&appId=${encodeURIComponent(appId || "empty")}`, req.url));
  }

  const state = Math.random().toString(36).substring(7);
  const url = connector.getAuthUrl(state);
  
  return NextResponse.redirect(url);
}
