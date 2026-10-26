import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "/api/webhooks/leads",
    description: "ADuniFY WhatsApp & CRM Leads Ingestion Webhook",
    auth: "Header 'Authorization: Bearer <WEBHOOK_SECRET>' or 'x-webhook-secret: <WEBHOOK_SECRET>' or query parameter '?secret=<WEBHOOK_SECRET>'",
    formatsSupported: [
      "Batch: { leads: [{ contactRef, messageText, adSetId }] }",
      "Single: { contactRef, messageText, adSetId }",
      "Aliases accepted: contactRef (or phone/from/sender/wa_id), messageText (or message/text/body), adSetId (or adset_id/source_id)"
    ]
  });
}

export async function POST(req: Request) {
  // 1. Authenticate the Webhook via API Key / Secret
  const authHeader = req.headers.get("authorization");
  const customHeader = req.headers.get("x-webhook-secret");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret") || url.searchParams.get("apiKey");

  const expectedSecret = process.env.WEBHOOK_SECRET;
  
  if (!expectedSecret) {
    return NextResponse.json({ error: "WEBHOOK_SECRET not configured on server" }, { status: 500 });
  }

  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const isAuthorized = 
    bearerToken === expectedSecret ||
    customHeader === expectedSecret ||
    querySecret === expectedSecret;
  
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing webhook secret" }, { status: 401 });
  }

  // 2. Parse the payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  // Support batch { leads: [...] }, raw array [...], single object, or Evolution API v2 events
  let rawLeads: any[] = [];
  
  // 2a. Evolution API v2 payload format
  if (body && (body.event === "messages.upsert" || body.data?.key)) {
    const data = body.data;
    const isFromMe = Boolean(data?.key?.fromMe);

    const remoteJid = String(data?.key?.remoteJid || "");
    if (remoteJid.includes("status@broadcast") || remoteJid.includes("@g.us")) {
      return NextResponse.json({ success: true, ignored: true, reason: "Status broadcast or group message" });
    }

    const cleanPhone = remoteJid.replace(/@.*$/, "");
    const pushName = !isFromMe && data?.pushName ? String(data.pushName).trim() : "";
    const contactRef = pushName ? `${pushName} (+${cleanPhone})` : (cleanPhone ? `+${cleanPhone}` : "Unknown");

    // Extract rich message text from any WhatsApp message type
    const msg = data?.message || {};
    let text = "";

    if (msg.conversation) {
      text = msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
      text = msg.extendedTextMessage.text;
    } else if (msg.imageMessage) {
      text = msg.imageMessage.caption ? `[Photo] ${msg.imageMessage.caption}` : "[Photo / Image]";
    } else if (msg.videoMessage) {
      text = msg.videoMessage.caption ? `[Video] ${msg.videoMessage.caption}` : "[Video]";
    } else if (msg.documentMessage) {
      const docName = msg.documentMessage.fileName || msg.documentMessage.title || "File";
      const docCaption = msg.documentMessage.caption ? ` - ${msg.documentMessage.caption}` : "";
      text = `[Document: ${docName}${docCaption}]`;
    } else if (msg.locationMessage) {
      const locName = msg.locationMessage.name || msg.locationMessage.address || "Pinned Location";
      text = `[Location: ${locName}]`;
    } else if (msg.audioMessage) {
      text = "[Voice Note / Audio]";
    } else if (msg.contactMessage) {
      text = `[Contact Card: ${msg.contactMessage.displayName || "Contact"}]`;
    } else if (msg.stickerMessage) {
      text = "[Sticker]";
    } else {
      text = "[Media / Action message]";
    }

    // Format clean instance name (e.g. Phone 1, Phone 2)
    const rawInstance = body.instance ? String(body.instance).replace(/_/g, " ").trim() : "";
    const instanceName = rawInstance 
      ? (rawInstance.toLowerCase().includes("phone") 
          ? rawInstance.replace(/\b\w/g, (c: string) => c.toUpperCase()) 
          : `Phone ${rawInstance.replace(/\b\w/g, (c: string) => c.toUpperCase())}`)
      : "WhatsApp";

    // Tag team replies with [Team • Phone X] and incoming with [Phone X]
    const instanceLabel = isFromMe 
      ? `[Team • ${instanceName}] ` 
      : (instanceName ? `[${instanceName}] ` : "");
    const messageText = `${instanceLabel}${text}`;

    rawLeads = [
      {
        contactRef,
        messageText,
        adSetId: null,
        isFromMe,
        instance: instanceName
      }
    ];
  } else if (Array.isArray(body)) {
    rawLeads = body;
  } else if (body && Array.isArray(body.leads)) {
    rawLeads = body.leads;
  } else if (body && typeof body === "object") {
    rawLeads = [body];
  }

  if (rawLeads.length === 0) {
    return NextResponse.json({ error: "Invalid payload: No lead records found" }, { status: 400 });
  }


  // 3. Pre-fetch ad sets to map incoming IDs or auto-match from message text
  const incomingAdSetIds = Array.from(
    new Set(
      rawLeads
        .map((l: any) => String(l.adSetId || l.adset_id || l.ad_id || l.source_id || ""))
        .filter(Boolean)
    )
  );

  const adSetMap = new Map<string, string>();
  if (incomingAdSetIds.length > 0) {
    const matchedAdSets = await prisma.adSet.findMany({
      where: {
        OR: [
          { platformAdSetId: { in: incomingAdSetIds } },
          { id: { in: incomingAdSetIds } }
        ]
      }
    });

    for (const adSet of matchedAdSets) {
      adSetMap.set(adSet.platformAdSetId, adSet.id);
      adSetMap.set(adSet.id, adSet.id);
    }
  }

  // Pre-fetch all ad sets for text-based auto-matching
  const { matchLeadToAdSet } = await import("@/lib/leadMatcher");
  const allAdSets = await prisma.adSet.findMany({
    select: {
      id: true,
      name: true,
      campaign: {
        select: {
          name: true,
          products: true,
          brand: { select: { id: true, name: true } }
        }
      }
    }
  });

  // 4. Save to Database: Number-wise lead grouping (one lead per phone number)
  const { normalizePhone, extractLeadMetadata } = await import("@/lib/leadMatcher");
  
  let insertedCount = 0;
  let updatedCount = 0;

// In-memory lock map to serialize concurrent webhook events for the same contact/number
const leadLocks = new Map<string, Promise<void>>();
async function runWithLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const current = leadLocks.get(key) || Promise.resolve();
  let release: () => void;
  const p = new Promise<void>((resolve) => { release = resolve; });
  const next = current.then(() => p);
  leadLocks.set(key, next);

  try {
    await current;
    return await fn();
  } finally {
    release!();
    if (leadLocks.get(key) === next) {
      leadLocks.delete(key);
    }
  }
}

  for (const l of rawLeads) {
    const adSetRef = String(l.adSetId || l.adset_id || l.ad_id || l.source_id || "");
    let mappedAdSetId = adSetRef ? adSetMap.get(adSetRef) || null : null;
    const contactRef = String(l.contactRef || l.phone || l.from || l.sender || l.wa_id || "Unknown");
    const messageText = l.messageText || l.message || l.text || l.body ? String(l.messageText || l.message || l.text || l.body) : null;

    if (!mappedAdSetId && messageText) {
      const autoMatch = matchLeadToAdSet(messageText, allAdSets);
      if (autoMatch.adSetId) {
        mappedAdSetId = autoMatch.adSetId;
      }
    }

    const phoneRaw = normalizePhone(contactRef);
    const meta = extractLeadMetadata(messageText, contactRef);
    const instance = l.instance ? String(l.instance).replace(/_/g, " ").trim() : meta.phoneInstance;
    const platform = meta.platform;
    const accountName = meta.accountName;

    const lockKey = phoneRaw || contactRef.toLowerCase().trim();

    await runWithLock(lockKey, async () => {
      // Check for existing lead by phone number or contactRef
      let existingLead = null;
      if (phoneRaw) {
        existingLead = await prisma.lead.findFirst({
          where: {
            OR: [
              { phoneRaw },
              { contactRef: { contains: phoneRaw } }
            ]
          },
          orderBy: { createdAt: "desc" }
        });
      } else if (contactRef && contactRef !== "Unknown") {
        existingLead = await prisma.lead.findFirst({
          where: { contactRef },
          orderBy: { createdAt: "desc" }
        });
      }

      if (existingLead) {
        // Append new message if not already present (exact message deduplication)
        const prevText = existingLead.messageText || "";
        const prevMessages = prevText ? prevText.split("\n---\n").map(m => m.trim()) : [];
        const isDuplicate = messageText ? prevMessages.includes(messageText.trim()) : true;

        let combinedText = prevText;
        let newCount = existingLead.messagesCount;
        if (messageText && !isDuplicate) {
          combinedText = prevText ? `${prevText}\n---\n${messageText.trim()}` : messageText.trim();
          newCount += 1;
        }

        // Determine combined instance (e.g. Phone 1 & Phone 2)
        let combinedInstance = existingLead.instance;
        if (instance && existingLead.instance && existingLead.instance !== instance) {
          if (!existingLead.instance.includes(instance)) {
            combinedInstance = `${existingLead.instance} & ${instance}`;
          }
        } else if (instance) {
          combinedInstance = instance;
        }

        // Only update contactRef from incoming customer messages (not from staff replies)
        let updatedContactRef = existingLead.contactRef;
        if (!l.isFromMe && contactRef && contactRef !== "Unknown") {
          if (!existingLead.contactRef || existingLead.contactRef === "Unknown" || existingLead.contactRef.startsWith("+")) {
            updatedContactRef = contactRef;
          }
        }

        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            contactRef: updatedContactRef,
            phoneRaw: existingLead.phoneRaw || phoneRaw,
            instance: combinedInstance,
            platform: platform !== "WhatsApp Direct" ? platform : existingLead.platform,
            accountName: accountName || existingLead.accountName,
            messageText: combinedText,
            messagesCount: newCount,
            adSetId: existingLead.adSetId || mappedAdSetId,
            updatedAt: new Date()
          }
        });
        updatedCount++;
      } else {
        await prisma.lead.create({
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
        insertedCount++;
      }
    });
  }

  try {
    const { invalidateServicesCache } = await import("@/lib/services");
    invalidateServicesCache();
  } catch {}

  return NextResponse.json({
    success: true,
    inserted: insertedCount,
    updated: updatedCount,
    message: `Processed ${rawLeads.length} message(s): ${insertedCount} new lead(s) created, ${updatedCount} existing lead(s) updated`
  });
}

