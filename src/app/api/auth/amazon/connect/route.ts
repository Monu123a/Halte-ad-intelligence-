import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connector/registry";
import { AmazonAdsConnector } from "@/lib/connector/amazon";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/amazon/callback`;
  const connector = new AmazonAdsConnector(redirectUri);
  const state = Math.random().toString(36).substring(7);
  return NextResponse.redirect(connector.getAuthUrl(state));
}
