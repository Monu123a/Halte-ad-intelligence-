import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runGeoSync } from "@/lib/sync/geoSync";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role === "LEAD_TAGGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await runGeoSync();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Geo sync error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync geo data" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
