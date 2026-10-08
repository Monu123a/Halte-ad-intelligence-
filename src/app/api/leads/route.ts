import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  
  const where = status === "untagged" ? { tag: "UNTAGGED" as const } : {};
  
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      adSet: {
        include: {
          campaign: {
            include: { brand: true }
          }
        }
      }
    }
  });

  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leads } = await req.json();
  
  if (!leads || !Array.isArray(leads)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Pre-fetch ad sets to map incoming IDs (could be internal ID or platformAdSetId)
  const incomingAdSetIds = Array.from(new Set(leads.map((l: any) => l.adSetId).filter(Boolean)));
  
  const matchedAdSets = await prisma.adSet.findMany({
    where: {
      OR: [
        { id: { in: incomingAdSetIds } },
        { platformAdSetId: { in: incomingAdSetIds } }
      ]
    }
  });

  const adSetMap = new Map();
  for (const adSet of matchedAdSets) {
    adSetMap.set(adSet.id, adSet.id);
    adSetMap.set(adSet.platformAdSetId, adSet.id);
  }

  const created = await prisma.lead.createMany({
    data: leads.map((l: any) => {
      const mappedAdSetId = l.adSetId ? adSetMap.get(l.adSetId) : null;
      return {
        contactRef: l.contactRef,
        messageText: l.messageText,
        adSetId: mappedAdSetId
      };
    })
  });

  return NextResponse.json({ success: true, count: created.count });
}
