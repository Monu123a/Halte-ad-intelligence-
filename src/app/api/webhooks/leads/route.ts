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
    const isFromMe = data?.key?.fromMe;
    if (isFromMe) {
      return NextResponse.json({ success: true, ignored: true, reason: "Outgoing message from staff" });
    }

    const remoteJid = String(data?.key?.remoteJid || "");
    if (remoteJid.includes("status@broadcast") || remoteJid.includes("@g.us")) {
      return NextResponse.json({ success: true, ignored: true, reason: "Status broadcast or group message" });
    }

    const cleanPhone = remoteJid.replace(/@.*$/, "");
    const pushName = data?.pushName ? String(data.pushName).trim() : "";
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


    const instanceLabel = body.instance ? `[${body.instance}] ` : "";
    const messageText = `${instanceLabel}${text}`;

    rawLeads = [
      {
        contactRef,
        messageText,
        adSetId: null
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

  // 4. Save to Database
  const created = await prisma.lead.createMany({
    data: rawLeads.map((l: any) => {
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

      return {
        contactRef,
        messageText,
        adSetId: mappedAdSetId
      };
    })
  });

  try {
    const { invalidateServicesCache } = await import("@/lib/services");
    invalidateServicesCache();
  } catch {}

  return NextResponse.json({
    success: true,
    inserted: created.count,
    message: `Successfully received and saved ${created.count} lead(s)`
  });
}

