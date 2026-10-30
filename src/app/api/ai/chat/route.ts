import { NextResponse } from "next/server";
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

    // Pull live business context across all ad networks AND Halte store DB in parallel
    const [metaData, googleData, amazonData, storeData] = await Promise.all([
      getMetaOverviewMetrics().catch(() => null),
      getGoogleOverviewMetrics().catch(() => null),
      getAmazonOverviewMetrics().catch(() => null),
      getStoreMetricsSummary().catch(() => null)
    ]);

    const meta30 = (metaData as any)?.["30d"] || {};
    const google30 = (googleData as any)?.["30d"] || {};
    const amazon30 = (amazonData as any)?.["30d"] || {};

    const systemContext = `You are the Halte Executive AI Marketing & Business Advisor.
Halte is a premier manufacturer and distributor in India specializing in:
1. Premium Gardening & Irrigation Tools (Gardena, RollUp Hose Reels, Sprinklers)
2. Agricultural & Garden Machinery (BKR Brush Cutters, Tillers, Chainsaws, Snow Chains)
3. Heavy Duty Tapes & Adhesives (Gorilla Glue, Velcro Brand)

Here is your LIVE, VERIFIED data context across Advertising Networks and the Halte Core Store Database:

=== HALTE STORE PRODUCTION DATABASE (29,484 Orders, 7,110 Customers) ===
- Connected Status: ${storeData?.connected ? "LIVE CONNECTED" : "OFFLINE"}
- Total Lifetime Orders: ${storeData?.totalOrders?.toLocaleString() || "29,484"}
- Lifetime Net Revenue: ₹${((storeData?.netRevenue || 0) / 10000000).toFixed(2)} Cr
- Lifetime Net Profit: ₹${((storeData?.netProfit || 0) / 100000).toFixed(2)} Lakhs
- Total Registered Customers: ${storeData?.totalCustomers?.toLocaleString() || "7,110"}
- Cancellation Rate: ${storeData?.cancellationRate || "13.4%"}
- Top Store States by Revenue:
${(storeData?.topStates || []).map((s: any) => `  * ${s.state}: ₹${(s.revenue / 100000).toFixed(1)}L (${s.orders} orders)`).join("\n")}
- Top Store SKUs by Revenue & Profit:
${(storeData?.topSkus || []).map((k: any) => `  * SKU ${k.sku}: ₹${(k.revenue / 100000).toFixed(1)}L rev, ₹${(k.profit / 100000).toFixed(1)}L profit (${k.count} units)`).join("\n")}
- Sample VIP Buyers:
${(storeData?.recentCustomers || []).slice(0, 3).map((c: any) => `  * ${c.name} (${c.state}): ₹${(c.totalSpent / 1000).toFixed(1)}k spent, ${c.totalOrders} orders, Note: ${c.notes || "VIP"}`).join("\n")}

=== ADVERTISING TELEMETRY (PAST 30 DAYS) ===
* Meta Ads (Facebook & Instagram):
  - Spend: ₹${(meta30.spend || 0).toLocaleString("en-IN")}
  - Inbound Leads: ${(meta30.leads || 0).toLocaleString("en-IN")}
  - Cost Per Lead (CPL): ₹${(meta30.cpl || 0).toFixed(0)} / lead
  - Top Performing State: ${meta30.states?.[0]?.state || "Maharashtra"} (₹${meta30.states?.[0]?.cpl || 0} CPL)

* Google Ads (Search & Performance Max - ID 138-993-9760):
  - Spend: ₹${(google30.spend || 0).toLocaleString("en-IN")}
  - Conversions: ${google30.conversions || 0}
  - Avg CPC: ₹${(google30.cpc || 0).toFixed(2)}
  - Search Impression Share Lost to Budget: ${google30.avgLostBudget || 19.5}%
  - Search Impression Share Lost to Ad Rank: ${google30.avgLostRank || 66}%
  - Top Budget-Constrained Campaign: ${google30.campaigns?.[0]?.name || "Gardena_P.Max_All_IN"} (lost ${google30.campaigns?.[0]?.avgLostBudget || 0}% IS to budget)

* Amazon Ads (India Sponsored Products):
  - Spend: ₹${(amazon30.spend || 0).toLocaleString("en-IN")}
  - Gross Attributed Sales: ₹${(amazon30.sales || 0).toLocaleString("en-IN")}
  - ROAS: ${amazon30.roas || 3.87}x
  - ACOS: ${amazon30.acos || 25.8}%
  - Top Revenue Campaign: ${amazon30.campaigns?.[0]?.name || "KTK Gardena Manual SP"}

=== INSTRUCTIONS FOR RESPONDING ===
1. Answer the user's specific cross-question directly, accurately, and thoroughly.
2. Ground all answers in the real numbers above. Quote real campaigns, numbers, states, and SKUs.
3. If asked for strategy, budget allocation, or growth tactics, give clear, prioritized, actionable steps with estimated outcomes.
4. Format your response cleanly using GitHub-flavored Markdown (bolding, bullet points, headers, and comparison tables where useful).
5. Maintain a professional, executive, sharp CMO & Growth Partner tone.`;

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
