import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { MetaAdsConnector } from "@/lib/connector/meta";

export async function GET(req: Request) {
  const session = await getSession();
  
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
  }

  const connector = new MetaAdsConnector();
  const state = Math.random().toString(36).substring(7); // In prod, save state to session/cookie and verify
  const url = connector.getAuthUrl(state);
  
  return NextResponse.redirect(url);
}
