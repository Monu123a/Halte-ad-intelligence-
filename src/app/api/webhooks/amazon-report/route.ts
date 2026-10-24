import { NextResponse } from "next/server";
import { parseAmazonReportBuffer, ingestAmazonReportRows } from "@/lib/amazonReportParser";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let fileName = "Daily Automated Report";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = (formData.get("attachment") || formData.get("file") || formData.get("attachment1")) as File | null;
      if (file) {
        fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.base64Content) {
        buffer = Buffer.from(body.base64Content, "base64");
        if (body.fileName) fileName = body.fileName;
      }
    } else {
      const arrayBuffer = await req.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: "No report payload received" }, { status: 400 });
    }

    const rows = parseAmazonReportBuffer(buffer);
    const result = await ingestAmazonReportRows(rows, `Amazon Store (${fileName})`);

    return NextResponse.json({
      success: true,
      message: `Automated Amazon sync processed ${result.campaignsCount} campaigns and ${result.rowsIngested} metric rows.`,
      result
    });
  } catch (error: any) {
    console.error("[Amazon Automated Webhook Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
