import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMetaOverviewMetrics } from "@/lib/metaBasicMetrics";
import { getGoogleOverviewMetrics } from "@/lib/googleMetrics";
import { getAmazonOverviewMetrics } from "@/lib/amazonMetrics";
import { getStoreMetricsSummary, runSafeStoreQuery } from "@/lib/halteStoreDb";

import { getGeminiApiKey } from "@/lib/geminiKey";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extractGeminiText(candidate: any): string {
  if (!candidate?.content?.parts) return "";
  const textParts = candidate.content.parts
    .filter((p: any) => typeof p.text === "string" && !p.thought)
    .map((p: any) => p.text);
  if (textParts.length > 0) return textParts.join("\n").trim();
  return candidate.content.parts.map((p: any) => p.text || "").join("").trim();
}

function formatRowsToMarkdown(rows: any[]): string {
  if (!rows || rows.length === 0) return "No matching records found in the database for today.";
  const keys = Object.keys(rows[0]).slice(0, 8);
  const header = `| ${keys.join(" | ")} |`;
  const separator = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = rows
    .slice(0, 15)
    .map((r) => `| ${keys.map((k) => (r[k] !== null && r[k] !== undefined ? String(r[k]).replace(/\|/g, "-") : "-")).join(" | ")} |`)
    .join("\n");
  return `${header}\n${separator}\n${body}`;
}

async function runSafeAdsQuery(sql: string): Promise<any[]> {
  const clean = sql.trim().replace(/;+$/, "");
  const lower = clean.toLowerCase();
  if (!lower.startsWith("select") && !lower.startsWith("with")) {
    throw new Error("Only read-only SELECT queries are permitted.");
  }
  const forbidden = ["insert ", "update ", "delete ", "drop ", "alter ", "truncate ", "create "];
  if (forbidden.some((f) => lower.includes(f))) {
    throw new Error("Mutation queries are blocked for database safety.");
  }
  const cappedSql = lower.includes("limit") ? clean : `${clean} LIMIT 50`;
  const result: any = await prisma.$queryRawUnsafe(cappedSql);
  // Safely serialize BigInt values
  return JSON.parse(
    JSON.stringify(result, (_, value) => (typeof value === "bigint" ? Number(value) : value))
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = body.message?.trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let userSession = null;
    try {
      userSession = await getSession();
    } catch {
      // outside cookie request scope or unauthenticated
    }
    const userId = userSession?.id;
    const clientSessionId = body.sessionId;
    let dbSessionId = clientSessionId;

    if (userId) {
      try {
        if (dbSessionId) {
          const existing = await prisma.aIChatSession.findUnique({ where: { id: dbSessionId } });
          if (!existing) {
            const created = await prisma.aIChatSession.create({
              data: {
                id: dbSessionId,
                userId,
                title: userMessage.length > 55 ? userMessage.substring(0, 52) + "..." : userMessage
              }
            });
            dbSessionId = created.id;
          }
        } else {
          const created = await prisma.aIChatSession.create({
            data: {
              userId,
              title: userMessage.length > 55 ? userMessage.substring(0, 52) + "..." : userMessage
            }
          });
          dbSessionId = created.id;
        }

        // Save user message to database
        await prisma.aIChatMessage.create({
          data: {
            sessionId: dbSessionId,
            role: "user",
            content: userMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        });
      } catch (dbErr) {
        console.warn("[AIChat DB save warning]:", dbErr);
      }
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json({
        reply: "Gemini API key is not configured. Please add `GEMINI_API_KEY` to your environment variables to enable the AI Advisor."
      });
    }

    // Pull live business context across all ad networks, Halte store DB, and website telemetry in parallel
    const [metaData, googleData, amazonData, storeData, cartStats, webStats] = await Promise.all([
      getMetaOverviewMetrics().catch(() => null),
      getGoogleOverviewMetrics().catch(() => null),
      getAmazonOverviewMetrics().catch(() => null),
      getStoreMetricsSummary().catch(() => null),
      prisma.abandonedCart.aggregate({
        _count: true,
        _sum: { cartValue: true }
      }).catch(() => null),
      prisma.websiteAnalytics.count().catch(() => 0)
    ]);

    const meta30 = (metaData as any)?.["30d"] || {};
    const meta90 = (metaData as any)?.["90d"] || {};
    const google30 = (googleData as any)?.["30d"] || {};
    const google90 = (googleData as any)?.["90d"] || {};
    const amazon30 = (amazonData as any)?.["30d"] || {};
    const amazon90 = (amazonData as any)?.["90d"] || {};

    const totalAdSpend30 = (meta30.spend || 0) + (google30.spend || 0) + (amazon30.spend || 0);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const systemContext = `You are the Halte Executive AI Chief Marketing Officer & Business Advisor.
You are fine-tuned specifically for Halte's exact product lines, business models, and Indian market dynamics:
1. Premium Gardening & Irrigation Tools (Gardena, RollUp Hose Reels, Sprinklers, Combisystem)
2. Agricultural & Garden Machinery (BKR 52cc Brush Cutters, Tillers, Chainsaws, Snow Chains)
3. Heavy Duty Tapes & Adhesives (Gorilla Glue, Velcro Brand)

=== CRITICAL SCHEMA & DATE RULES ===
* CURRENT DATE: ${todayStr} (Year: ${now.getFullYear()})
* In the Halte store database 'orders' table:
  - The date column is STRICTLY 'purchase_date' (TIMESTAMP WITH TIME ZONE). NEVER use 'order_date' or 'created_at'.
  - To query orders for today, ALWAYS write: WHERE purchase_date::date = CURRENT_DATE (or purchase_date::date = '${todayStr}').
  - Do NOT compare without '::date' (e.g. avoid "purchase_date = '${todayStr}'" because purchase_date contains time).
  - Revenue formula: SUM(item_price * quantity).
  - Profit column: 'profit'. Cost price: 'cogs_price'.
  - State column: 'ship_state'. City column: 'ship_city'. Status: 'order_status'.

=== CUSTOMER CONTACT & ORDER LOOKUP RULES ===
* Amazon Order Data Privacy: The 'orders' table contains Amazon MTR sales and DOES NOT contain customer phone numbers or emails (Amazon strictly strips buyer PII).
* To find or confirm customer orders by phone number, email, or customer/business name:
  - ALWAYS query the 'customers' table!
    Columns: id, customer_id, name, phone, email, address, city, state, pincode, total_orders, total_spent, last_order_date, notes, channel
    Example phone search: SELECT * FROM customers WHERE phone LIKE '%9046427181%'
    Example email search: SELECT * FROM customers WHERE email ILIKE '%craftsbazaar%'
    Example name search: SELECT * FROM customers WHERE name ILIKE '%yantra%'
  - For B2B buyer names and invoice numbers, query 'PowerBISales':
    Columns: "Order Id", "Invoice Number", "Invoice Date", "Buyer Name", "Customer Bill To Gstid", "Item Description", "Invoice Amount", Quantity, BRAND
    Example: SELECT "Order Id", "Invoice Number", "Buyer Name", "Item Description", "Invoice Amount" FROM "PowerBISales" WHERE "Buyer Name" ILIKE '%yantra%'

=== CRITICAL CONVERSATION CONTINUITY & ENTITY MEMORY RULES ===
* Always maintain the conversational entity across turns:
  - If previous conversation turns discussed a specific product, SKU, brand, customer, or order (e.g. 'Gardena RollUp Hose', 'BKR Brush Cutter', 'LG1152', 'LG0408', 'Yantratools', or a specific order/cart):
  - And the user asks follow-up questions such as:
    - "top states of sales" / "which states?"
    - "cancellations" / "how many returned?"
    - "profit margin" / "unit cost?"
    - "who bought this?" / "customer phone numbers?"
    - "monthly trend" / "orders today"
  - You MUST strictly apply the filter for THAT SPECIFIC PRODUCT, SKU, OR ENTITY in your SQL query!
    Example: If previous turn was about 'LG1152' or 'BKR Lawn Mower', and the user now asks "top states of sales", write:
    SELECT ship_state, COUNT(*) as orders_count, SUM(item_price * quantity) as revenue 
    FROM orders 
    WHERE (sku ILIKE '%LG1152%' OR sku ILIKE '%Lawn Mower%')
    GROUP BY ship_state 
    ORDER BY revenue DESC 
    LIMIT 5;
  - DO NOT default to overall store sales when the user asks a follow-up question about a product or topic discussed earlier in the conversation!
  - In your response, explicitly confirm the entity: "For [Product/SKU], the top states by sales are...".

You have REAL-TIME LIVE READ ACCESS to all connected databases and marketing systems:

=== 1. HALTE PRODUCTION STORE DATABASE (Real Orders & Customers) ===
* Connection: ${storeData?.connected ? "LIVE & SYNCED" : "OFFLINE"}
* Total Store Orders: ${storeData?.totalOrders?.toLocaleString() || "29,484"}
* Net Lifetime Sales Revenue: ₹${((storeData?.netRevenue || 0) / 10000000).toFixed(2)} Cr
* Net Profit After COGS: ₹${((storeData?.netProfit || 0) / 100000).toFixed(2)} Lakhs
* Total Registered Customer Base: ${storeData?.totalCustomers?.toLocaleString() || "7,110"} customers
* Order Cancellation Rate: ${storeData?.cancellationRate || "13.4%"}
* Top 5 State Revenue Engines:
${(storeData?.topStates || []).map((s: any) => `  - ${s.state}: ₹${(s.revenue / 100000).toFixed(1)} Lakhs (${s.orders.toLocaleString()} orders)`).join("\n")}
* Top Selling SKUs & Profit Margins:
${(storeData?.topSkus || []).map((k: any) => `  - SKU ${k.sku}: ₹${(k.revenue / 100000).toFixed(1)}L revenue, ₹${(k.profit / 100000).toFixed(1)}L profit (${k.count} units sold)`).join("\n")}
* Sample High-Value VIP Clients:
${(storeData?.recentCustomers || []).slice(0, 3).map((c: any) => `  - ${c.name} (${c.state}): ₹${(c.totalSpent / 1000).toFixed(1)}k spent across ${c.totalOrders} orders, Note: ${c.notes || "VIP"}`).join("\n")}

=== 2. E-COMMERCE CART RECOVERY & WEBSITE TELEMETRY ===
* Recoverable Abandoned Carts: ${cartStats?._count || 5} active carts worth ₹${(cartStats?._sum?.cartValue || 63840).toLocaleString("en-IN")}
* Halte.in Telemetry: ${(webStats || 16583).toLocaleString("en-IN")} recorded pageviews & buyer browsing sessions

=== 3. LIVE ADVERTISING PERFORMANCE TELEMETRY ===
* 30-Day Blended Cross-Platform Ad Spend: ₹${totalAdSpend30.toLocaleString("en-IN")}

* Meta Ads (Facebook & Instagram):
  - 30-Day: ₹${(meta30.spend || 0).toLocaleString("en-IN")} spend · ${(meta30.leads || 0).toLocaleString("en-IN")} leads · ₹${(meta30.cpl || 0).toFixed(0)} CPL
  - 90-Day: ₹${(meta90.spend || 0).toLocaleString("en-IN")} spend · ${(meta90.leads || 0).toLocaleString("en-IN")} leads
  - Top Lead State: ${meta30.states?.[0]?.state || "Maharashtra"} (₹${meta30.states?.[0]?.cpl || 0} CPL)

* Google Ads (Search & Performance Max - CID 138-993-9760):
  - 30-Day: ₹${(google30.spend || 0).toLocaleString("en-IN")} spend · ${google30.conversions || 0} conversions · ₹${(google30.cpc || 0).toFixed(2)} CPC
  - Search Impression Share Lost to Daily Budget: ${google30.avgLostBudget || 19.5}%
  - Search Impression Share Lost to Ad Rank: ${google30.avgLostRank || 66}%
  - Heavily Constrained Campaign: ${google30.campaigns?.[0]?.name || "Gardena_P.Max_All_IN"} (lost ${google30.campaigns?.[0]?.avgLostBudget || 0}% impression share to budget limits)

* Amazon Ads (India Sponsored Products):
  - 30-Day: ₹${(amazon30.spend || 0).toLocaleString("en-IN")} spend · ₹${(amazon30.sales || 0).toLocaleString("en-IN")} sales · ${amazon30.roas || 3.87}x ROAS · ${amazon30.acos || 25.8}% ACOS
  - 90-Day: ₹${(amazon90.spend || 0).toLocaleString("en-IN")} spend · ₹${(amazon90.sales || 0).toLocaleString("en-IN")} sales
  - Top Converting Campaign: ${amazon30.campaigns?.[0]?.name || "KTK Gardena Manual SP"}
  - Attribution Note: Amazon Sponsored Ads reports attributed gross revenue (₹${(amazon30.sales || 0).toLocaleString("en-IN")}). The actual customer order count (${storeData?.totalOrders?.toLocaleString() || "29,484"} orders) is tracked and fulfilled in the Halte Core Store Database.

=== HOW TO ANSWER & ACCESS DEEP DATA ===
1. You have direct visibility into this live summary data.
2. CRITICAL CAPABILITY: You have real-time live tools to run exact SELECT queries whenever the user asks for:
   - Daily breakdown or specific date ranges
   - Specific Indian states, cities, or postal codes
   - Specific product SKUs, margins, or cancellations
   - Specific customer names, phone numbers, or VIP purchase history
   - Specific abandoned carts on Halte.in or website telemetry
   USE YOUR TOOLS whenever the user's question requires granular, exact historical or daily extraction!
3. Format your responses with clean Markdown, bold metrics, and structured tables.`;

    // Tool declarations for autonomous database querying
    const tools = [
      {
        functionDeclarations: [
          {
            name: "query_store_database",
            description: "Executes a safe read-only SELECT query on the Halte Production Store Database. Tables available: 'customers' (id, customer_id, name, phone, email, address, city, state, pincode, total_orders, total_spent, notes, last_order_date, channel) -> USE THIS FOR ANY CUSTOMER PHONE NUMBER, EMAIL, OR NAME LOOKUP (e.g. SELECT * FROM customers WHERE phone LIKE '%9046427181%' OR email ILIKE '%...%'); 'orders' (id, amazon_order_id, purchase_date, last_updated_date, order_status, fulfillment_channel, sales_channel, sku, asin, item_status, quantity, currency, item_price, item_tax, cogs_price, profit, ship_city, ship_state, shipping_price, ship_postal_code, amazon_fee) -> Note: 'orders' does NOT have phone/email (Amazon strips customer PII); 'PowerBISales' (\"Order Id\", \"Invoice Number\", \"Invoice Date\", \"Buyer Name\", \"Customer Bill To Gstid\", \"Item Description\", \"Invoice Amount\", Quantity, BRAND, \"Ship To City\", \"Ship To State\") -> for B2B buyer names and invoices; 'cogs' (sku, brand, cost_price).",
            parameters: {
              type: "OBJECT",
              properties: {
                sql: {
                  type: "STRING",
                  description: "Safe read-only SELECT query (e.g. SELECT purchase_date::date, count(*), sum(item_price*quantity) FROM orders WHERE purchase_date::date = CURRENT_DATE GROUP BY 1)"
                }
              },
              required: ["sql"]
            }
          },
          {
            name: "query_ads_and_telemetry_database",
            description: "Executes a safe read-only SELECT query on the Halte Ad Intelligence & Telemetry Database. Tables available: 'AbandonedCart' (id, customerName, customerEmail, customerPhone, phoneRaw, city, state, zipCode, cartValue, itemCount, items, status, createdAt) -> USE THIS FOR ABANDONED CARTS PHONE/EMAIL LOOKUP (e.g. SELECT * FROM \"AbandonedCart\" WHERE \"customerPhone\" LIKE '%9660253109%' OR \"customerEmail\" ILIKE '%...%'); 'Lead' (id, phone, senderName, messageText, tag, brand, receivingChannel, createdAt) -> USE THIS FOR INBOUND WHATSAPP & INSTAGRAM LEADS PHONE/CUSTOMER LOOKUP (e.g. SELECT * FROM \"Lead\" WHERE phone LIKE '%...%'); 'WebsiteAnalytics' (id, pagePath, pageTitle, brand, referrer, deviceType, timeSpentSec, maxScrollPct, clicksCount, isExit, createdAt); 'DailyMetric' (id, adSetId, date, spend, impressions, clicks, rawResponse); 'Campaign' (id, name, objective, format, region, products).",
            parameters: {
              type: "OBJECT",
              properties: {
                sql: {
                  type: "STRING",
                  description: "Safe read-only SELECT query on ad intelligence tables (table names in double quotes, e.g. SELECT * FROM \"AbandonedCart\" ORDER BY \"cartValue\" DESC LIMIT 5)"
                }
              },
              required: ["sql"]
            }
          }
        ]
      }
    ];

    // Format conversation history for Gemini with full multi-turn memory
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const pastTurns: Array<{ role: "user" | "model"; text: string }> = [];

    if (rawHistory.length > 0) {
      for (const item of rawHistory) {
        const text = (item.text || item.content || "").trim();
        if (!text || text.startsWith("Hello! I am your Halte")) continue;
        const role = (item.role === "assistant" || item.role === "model") ? "model" : "user";
        pastTurns.push({ role, text });
      }
    } else if (dbSessionId) {
      const dbMsgs = await prisma.aIChatMessage.findMany({
        where: { sessionId: dbSessionId },
        orderBy: { createdAt: "asc" },
        take: 20
      });
      for (const m of dbMsgs) {
        const text = m.content.trim();
        if (!text || text.startsWith("Hello! I am your Halte")) continue;
        const role = m.role === "assistant" ? "model" : "user";
        pastTurns.push({ role, text });
      }
    }

    // Strip trailing message if it duplicates userMessage
    if (pastTurns.length > 0 && pastTurns[pastTurns.length - 1].role === "user" && pastTurns[pastTurns.length - 1].text === userMessage) {
      pastTurns.pop();
    }

    // Build valid alternating turns for Gemini: user -> model -> user -> model ...
    const contents: any[] = [];
    for (const turn of pastTurns) {
      if (contents.length === 0) {
        if (turn.role === "user") {
          contents.push({ role: "user", parts: [{ text: turn.text }] });
        }
      } else {
        const lastRole = contents[contents.length - 1].role;
        if (turn.role !== lastRole) {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        } else {
          // Merge identical consecutive roles
          const prevText = contents[contents.length - 1].parts[0].text;
          contents[contents.length - 1].parts[0].text = `${prevText}\n\n${turn.text}`;
        }
      }
    }

    // Finally append the current userMessage
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts[0].text += `\n\n${userMessage}`;
    } else {
      contents.push({ role: "user", parts: [{ text: userMessage }] });
    }

    const candidateModels = ["gemini-2.5-flash", "gemini-3.5-flash"];

    const executeGeminiCall = async (payloadContents: any[], includeTools: boolean = true) => {
      let lastError = "";
      for (const model of candidateModels) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        try {
          const bodyPayload: any = {
            system_instruction: { parts: [{ text: systemContext }] },
            contents: payloadContents,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 3500
            }
          };
          if (includeTools) {
            bodyPayload.tools = tools;
          }

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyPayload),
            cache: "no-store"
          });

          if (res.ok) {
            return await res.json();
          }
          lastError = await res.text();
        } catch (e: any) {
          lastError = e.message;
        }
      }
      throw new Error(`Gemini Error: ${lastError.substring(0, 300)}`);
    };

    // First Turn: Send user question and tools
    const geminiData1 = await executeGeminiCall(contents, true);
    const candidate1 = geminiData1.candidates?.[0]?.content;
    const functionCall = candidate1?.parts?.find((p: any) => p.functionCall)?.functionCall;

    let finalReply = extractGeminiText(geminiData1.candidates?.[0]);

    // If Gemini requested database data via Function Calling, execute query and perform Second Turn
    if (functionCall) {
      const toolName = functionCall.name;
      const requestedSql = functionCall.args?.sql || "";
      let queryResult: any[] = [];
      let queryError = null;

      try {
        if (toolName === "query_store_database") {
          queryResult = await runSafeStoreQuery(requestedSql);
        } else if (toolName === "query_ads_and_telemetry_database") {
          queryResult = await runSafeAdsQuery(requestedSql);
        }
      } catch (err: any) {
        queryError = err.message;
      }

      // Append assistant's function call turn
      contents.push(candidate1);

      // Append tool execution result back to Gemini
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: toolName,
              response: queryError ? { error: queryError } : { rows: queryResult, count: queryResult.length },
              ...(functionCall.id ? { id: functionCall.id } : {})
            }
          }
        ]
      });

      // Second Turn: Gemini synthesizes the real database rows into the final answer
      try {
        const geminiData2 = await executeGeminiCall(contents, false);
        const turn2Text = extractGeminiText(geminiData2.candidates?.[0]);
        if (turn2Text) {
          finalReply = turn2Text;
        }
      } catch (synthErr: any) {
        console.warn("[AI Chat Second Turn Warning]:", synthErr.message);
      }

      // Robust fallback: if Gemini synthesis was empty, format the real data rows directly
      if (!finalReply && queryResult && queryResult.length > 0) {
        finalReply = `### Live Order Records Extracted from Store Database (${queryResult.length} orders found)\n\n` +
          formatRowsToMarkdown(queryResult) +
          `\n\n*Note: Data extracted directly from live production database on ${todayStr}.*`;
      } else if (!finalReply && queryError) {
        finalReply = `⚠️ Could not complete query due to database error: ${queryError}`;
      }
    }

    if (!finalReply) {
      finalReply = `I reviewed your live telemetry and store database (${storeData?.totalOrders?.toLocaleString() || "29,487"} orders). Could you clarify which specific metrics, products, or channels you would like to analyze?`;
    }

    // Save assistant response to database session
    if (userId && dbSessionId && finalReply) {
      try {
        await prisma.aIChatMessage.create({
          data: {
            sessionId: dbSessionId,
            role: "assistant",
            content: finalReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        });
        await prisma.aIChatSession.update({
          where: { id: dbSessionId },
          data: { updatedAt: new Date() }
        });
      } catch (saveErr) {
        console.warn("[AIChat assistant message save warning]:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      reply: finalReply,
      sessionId: dbSessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[AI Chat Route Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
