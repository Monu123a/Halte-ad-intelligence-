import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardRecommendations } from "@/lib/services";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recommendations = await getDashboardRecommendations();
  return NextResponse.json({ recommendations });
}
