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

  const { normalizePhone, extractLeadMetadata } = await import("@/lib/leadMatcher");

  let createdCount = 0;
  let updatedCount = 0;
  const processedKeys = new Map<string, string>(); // key -> lead.id

  for (const l of leads) {
    const mappedAdSetId = l.adSetId ? adSetMap.get(l.adSetId) : null;
    const contactRef = String(l.contactRef || "Unknown");
    const messageText = l.messageText ? String(l.messageText) : null;
    const phoneRaw = normalizePhone(contactRef);
    const meta = extractLeadMetadata(messageText, contactRef);
    const instance = l.instance || meta.phoneInstance;
    const platform = l.platform || meta.platform;
    const accountName = l.accountName || meta.accountName;

    const dedupKey = phoneRaw || contactRef.toLowerCase().trim();

    let existingLead = null;

    // First check if already touched in this batch
    if (processedKeys.has(dedupKey)) {
      const existingId = processedKeys.get(dedupKey)!;
      existingLead = await prisma.lead.findUnique({ where: { id: existingId } });
    }

    // Otherwise check database
    if (!existingLead && phoneRaw) {
      existingLead = await prisma.lead.findFirst({
        where: {
          OR: [
            { phoneRaw },
            { contactRef: { contains: phoneRaw } }
          ]
        },
        orderBy: { createdAt: "desc" }
      });
    } else if (!existingLead && contactRef && contactRef !== "Unknown") {
      existingLead = await prisma.lead.findFirst({
        where: { contactRef },
        orderBy: { createdAt: "desc" }
      });
    }

    if (existingLead) {
      const prevText = existingLead.messageText || "";
      let combinedText = prevText;
      if (messageText && !prevText.includes(messageText.trim())) {
        combinedText = prevText ? `${prevText}\n---\n${messageText.trim()}` : messageText.trim();
      }

      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          phoneRaw: existingLead.phoneRaw || phoneRaw,
          instance: existingLead.instance || instance,
          platform: existingLead.platform || platform,
          accountName: existingLead.accountName || accountName,
          messageText: combinedText,
          messagesCount: { increment: 1 },
          adSetId: existingLead.adSetId || mappedAdSetId,
          updatedAt: new Date()
        }
      });
      processedKeys.set(dedupKey, existingLead.id);
      updatedCount++;
    } else {
      const created = await prisma.lead.create({
        data: {
          contactRef,
          phoneRaw,
          instance,
          platform,
          accountName,
          messageText,
          messagesCount: 1,
          adSetId: mappedAdSetId
        }
      });
      processedKeys.set(dedupKey, created.id);
      createdCount++;
    }
  }

  try {
    const { invalidateServicesCache } = await import("@/lib/services");
    invalidateServicesCache();
  } catch {}

  return NextResponse.json({ 
    success: true, 
    count: createdCount + updatedCount,
    created: createdCount,
    updated: updatedCount 
  });
}
