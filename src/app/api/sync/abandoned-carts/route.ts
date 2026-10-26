import { NextResponse } from "next/server";
import { runAbandonedCartSync } from "@/lib/sync/abandonedCartSync";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runAbandonedCartSync();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync abandoned carts" },
      { status: 500 }
    );
  }
}
