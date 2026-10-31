import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { GoogleAdsConnector } from "@/lib/connector/google";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "MASTER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const connector = new GoogleAdsConnector(redirectUri);
  const state = Math.random().toString(36).substring(7);
  
  return NextResponse.redirect(connector.getAuthUrl(state));
}
