import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  // 1. Authenticate the Webhook via API Key
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.WEBHOOK_SECRET;
  
  if (!expectedSecret) {
    return NextResponse.json({ error: "WEBHOOK_SECRET not configured on server" }, { status: 500 });
  }
  
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse the payload
  const body = await req.json();
  const leads = body.leads;
  
  if (!leads || !Array.isArray(leads)) {
    return NextResponse.json({ error: "Invalid payload: Expected an array of 'leads'" }, { status: 400 });
  }

  // 3. Pre-fetch ad sets to map the Meta AdSet IDs to internal Database IDs
  const incomingAdSetIds = Array.from(new Set(leads.map((l: any) => String(l.adSetId)).filter(Boolean)));
  
  const matchedAdSets = await prisma.adSet.findMany({
    where: { platformAdSetId: { in: incomingAdSetIds } }
  });

  const adSetMap = new Map();
  for (const adSet of matchedAdSets) {
    adSetMap.set(adSet.platformAdSetId, adSet.id);
  }

  // 4. Save to Database
  const created = await prisma.lead.createMany({
    data: leads.map((l: any) => {
      const mappedAdSetId = l.adSetId ? adSetMap.get(String(l.adSetId)) : null;
      return {
        contactRef: String(l.contactRef || "Unknown"),
        messageText: l.messageText ? String(l.messageText) : null,
        adSetId: mappedAdSetId
      };
    })
  });

  return NextResponse.json({ success: true, inserted: created.count });
}
