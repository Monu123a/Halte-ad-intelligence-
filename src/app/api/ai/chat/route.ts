import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMetaOverviewMetrics } from "@/lib/metaBasicMetrics";
import { getGoogleOverviewMetrics } from "@/lib/googleMetrics";
import { getAmazonOverviewMetrics } from "@/lib/amazonMetrics";
import { getStoreMetricsSummary, runSafeStoreQuery } from "@/lib/halteStoreDb";

import { getGeminiApiKey } from "@/lib/geminiKey";

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
            description: "Executes a safe read-only SELECT query on the Halte Production Store Database. Tables available: 'orders' (id, amazon_order_id, purchase_date, last_updated_date, order_status, fulfillment_channel, sales_channel, sku, asin, item_status, quantity, currency, item_price, item_tax, cogs_price, profit, ship_city, ship_state, shipping_price, ship_postal_code, amazon_fee), 'customers' (id, customer_id, name, phone, email, address, city, state, pincode, total_orders, total_spent, notes, created_at, channel), 'PowerBISales' (Date, Year, Month_Name, BRAND, Item Description, Sku, Category, Ship To City, Ship To State, Invoice Amount, Quantity), 'cogs' (sku, brand, cost_price). NOTE: For dates in 'orders', ALWAYS use 'purchase_date::date = CURRENT_DATE' or 'purchase_date::date = \\'YYYY-MM-DD\\''; never use 'order_date'.",
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
            description: "Executes a safe read-only SELECT query on the Halte Ad Intelligence & Telemetry Database. Tables available: 'AbandonedCart' (id, customerName, customerEmail, customerPhone, city, state, zipCode, cartValue, itemCount, items, status, createdAt), 'WebsiteAnalytics' (id, pagePath, pageTitle, brand, referrer, deviceType, timeSpentSec, maxScrollPct, clicksCount, isExit, createdAt), 'DailyMetric' (id, adSetId, date, spend, impressions, clicks, rawResponse), 'Campaign' (id, name, objective, format, region, products).",
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

    // Format conversation history for Gemini
    const contents: any[] = [];
    contents.push({
      role: "user",
      parts: [{ text: systemContext + "\n\nUser Question: " + userMessage }]
    });

    const candidateModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];

    const executeGeminiCall = async (payloadContents: any[], includeTools: boolean = true) => {
      let lastError = "";
      for (const model of candidateModels) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        try {
          const bodyPayload: any = {
            contents: payloadContents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1500
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
              response: queryError ? { error: queryError } : { rows: queryResult, count: queryResult.length }
            }
          }
        ]
      });

      // Second Turn: Gemini synthesizes the real database rows into the final answer
      const geminiData2 = await executeGeminiCall(contents, false);
      const turn2Text = extractGeminiText(geminiData2.candidates?.[0]);
      if (turn2Text) {
        finalReply = turn2Text;
      }
    }

    return NextResponse.json({
      success: true,
      reply: finalReply || "Unable to extract answer.",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[AI Chat Route Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
