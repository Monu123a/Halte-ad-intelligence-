import { NextResponse } from "next/server";
import { getMetaOverviewMetrics } from "@/lib/metaBasicMetrics";
import { getGoogleOverviewMetrics } from "@/lib/googleMetrics";
import { getAmazonOverviewMetrics } from "@/lib/amazonMetrics";
import {
  PlatformTelemetrySummary,
  generateAlgorithmicStrategy,
  callGeminiStrategy
} from "@/lib/aiStrategy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") || "30d") as "30d" | "90d" | "all";

    const [metaData, googleData, amazonData] = await Promise.all([
      getMetaOverviewMetrics(),
      getGoogleOverviewMetrics(),
      getAmazonOverviewMetrics()
    ]);

    const metaPreset = (metaData as any)[range] || (metaData as any)["30d"];
    const googlePreset = (googleData as any)[range] || (googleData as any)["30d"];
    const amazonPreset = (amazonData as any)[range] || (amazonData as any)["30d"];

    const metaSpend = metaPreset?.spend || 0;
    const googleSpend = googlePreset?.spend || 0;
    const amazonSpend = amazonPreset?.spend || 0;
    const blendedSpend = metaSpend + googleSpend + amazonSpend;

    const amazonSales = amazonPreset?.sales || 0;
    const blendedRoas = blendedSpend > 0 && amazonSales > 0 ? amazonSales / blendedSpend : null;

    // Identify top constrained Google campaign
    let topConstrainedGoogle: any = undefined;
    if (googlePreset?.campaigns && googlePreset.campaigns.length > 0) {
      const budgetConstrained = [...googlePreset.campaigns]
        .filter((c: any) => (c.avgLostBudget || 0) > 0)
        .sort((a: any, b: any) => (b.avgLostBudget || 0) - (a.avgLostBudget || 0))[0];

      if (budgetConstrained) {
        topConstrainedGoogle = {
          name: budgetConstrained.name,
          lostBudget: budgetConstrained.avgLostBudget || 0,
          lostRank: budgetConstrained.avgLostRank || 0
        };
      }
    }

    // Identify top converting Amazon campaign
    let topAmazonCampaign: any = undefined;
    if (amazonPreset?.campaigns && amazonPreset.campaigns.length > 0) {
      const topSalesCamp = [...amazonPreset.campaigns]
        .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))[0];
      if (topSalesCamp) {
        topAmazonCampaign = {
          name: topSalesCamp.name,
          sales: topSalesCamp.sales || 0,
          acos: topSalesCamp.acos || null,
          roas: topSalesCamp.roas || null
        };
      }
    }

    // Top state for Meta
    const topStateObj = metaPreset?.states && metaPreset.states.length > 0 ? metaPreset.states[0] : null;

    const telemetry: PlatformTelemetrySummary = {
      range,
      blendedSpend,
      blendedRoas,
      meta: {
        spend: metaSpend,
        impressions: metaPreset?.impressions || 0,
        clicks: metaPreset?.clicks || 0,
        leads: metaPreset?.leads || 0,
        cpl: metaPreset?.cpl || 0,
        topState: topStateObj?.state
      },
      google: {
        spend: googleSpend,
        impressions: googlePreset?.impressions || 0,
        clicks: googlePreset?.clicks || 0,
        conversions: googlePreset?.conversions || 0,
        cpc: googlePreset?.cpc || 0,
        ctr: googlePreset?.ctr || 0,
        avgLostBudget: googlePreset?.avgLostBudget ?? null,
        avgLostRank: googlePreset?.avgLostRank ?? null,
        topConstrainedCampaign: topConstrainedGoogle
      },
      amazon: {
        spend: amazonSpend,
        sales: amazonSales,
        impressions: amazonPreset?.impressions || 0,
        clicks: amazonPreset?.clicks || 0,
        orders: amazonPreset?.orders || 0,
        roas: amazonPreset?.roas ?? null,
        acos: amazonPreset?.acos ?? null,
        topCampaign: topAmazonCampaign
      }
    };

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (apiKey) {
      try {
        const geminiResult = await callGeminiStrategy(telemetry, apiKey);
        return NextResponse.json({ success: true, ...geminiResult, telemetry });
      } catch (err: any) {
        console.warn("[AI Strategy] Gemini call failed, using dynamic fallback:", err.message);
      }
    }

    // Dynamic algorithmic fallback
    const fallbackResult = generateAlgorithmicStrategy(telemetry);
    return NextResponse.json({ success: true, ...fallbackResult, telemetry });
  } catch (error: any) {
    console.error("[AI Strategy Route Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
