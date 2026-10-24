import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseAmazonReportBuffer, ingestAmazonReportRows } from "@/lib/amazonReportParser";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const rows = parseAmazonReportBuffer(buffer);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Could not find valid Amazon campaign data in file" }, { status: 400 });
    }

    const result = await ingestAmazonReportRows(rows, `Amazon Store (${file.name})`);

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${result.campaignsCount} Amazon campaigns and ${result.rowsIngested} metric rows.`,
      result
    });
  } catch (error: any) {
    console.error("Amazon Report Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process Amazon report" }, { status: 500 });
  }
}
