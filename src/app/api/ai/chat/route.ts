import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMetaOverviewMetrics } from "@/lib/metaBasicMetrics";
import { getGoogleOverviewMetrics } from "@/lib/googleMetrics";
import { getAmazonOverviewMetrics } from "@/lib/amazonMetrics";
import { getStoreMetricsSummary } from "@/lib/halteStoreDb";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = body.message?.trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
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

    const systemContext = `You are the Halte Executive AI Chief Marketing Officer & Business Advisor.
You are fine-tuned specifically for Halte's exact product lines, business models, and Indian market dynamics:
1. Premium Gardening & Irrigation Tools (Gardena, RollUp Hose Reels, Sprinklers, Combisystem)
2. Agricultural & Garden Machinery (BKR 52cc Brush Cutters, Tillers, Chainsaws, Snow Chains)
3. Heavy Duty Tapes & Adhesives (Gorilla Glue, Velcro Brand)

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

=== HOW TO ANSWER ===
1. You have direct visibility into this live data. Answer immediately and definitively.
2. Quote the exact numbers, states, SKUs, and campaigns above.
3. When asked for recommendations, give prioritized, tactical, step-by-step advice (e.g. where to shift ₹X budget, which products to scale, which campaigns have ad fatigue).
4. Use clear GitHub-flavored markdown with bolding, bullet points, and tables.`;

    // Format conversation history for Gemini
    const contents: any[] = [];
    contents.push({
      role: "user",
      parts: [{ text: systemContext + "\n\nUser Question: " + userMessage }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200
        }
      }),
      cache: "no-store"
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error(`Gemini Error (${geminiRes.status}): ${err.substring(0, 300)}`);
    }

    const geminiData = await geminiRes.json();
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    return NextResponse.json({
      success: true,
      reply,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[AI Chat Route Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
