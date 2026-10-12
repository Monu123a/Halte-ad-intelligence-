import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connector/registry";
import { AmazonAdsConnector } from "@/lib/connector/amazon";

export async function GET(req: Request) {
  const connector = getConnector("AMAZON") as AmazonAdsConnector;
  const state = Math.random().toString(36).substring(7);
  // Optional: store state in a cookie for validation
  return NextResponse.redirect(connector.getAuthUrl(state));
}
