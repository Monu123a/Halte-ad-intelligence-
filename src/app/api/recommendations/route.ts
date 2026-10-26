import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardRecommendations } from "@/lib/services";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rangeParam = url.searchParams.get("range");
  const range: "30d" | "90d" | "all" = rangeParam === "90d" || rangeParam === "all" ? rangeParam : "30d";

  const recommendations = await getDashboardRecommendations(range);
  return NextResponse.json({ recommendations });
}
