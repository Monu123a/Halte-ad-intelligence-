import { Decimal } from "@prisma/client/runtime/library";

export interface AdSetStats {
  adSetId: string;
  spend: number;
  clicks: number;
  genuineLeads: number;
  convertedLeads: number;
  brandId: string;
  isSeasonalBrand: boolean;
  products?: string[];
  region?: string;
  objective?: string; // e.g. MESSAGES, LINK_CLICKS, REACH
  optimizationGoal?: string;
  destinationType?: string;
}

export interface SeasonalLookup {
  [product: string]: {
    validRegions: string[];
    validMonths: number[]; // 1-12
  }
}

export function calculateCostPerGenuine(spend: number, genuine: number): number {
  if (genuine === 0) return spend > 0 ? Infinity : 0;
  return spend / genuine;
}

export function calculateCostPerClick(spend: number, clicks: number): number {
  if (clicks === 0) return spend > 0 ? Infinity : 0;
  return spend / clicks;
}

export function isMessagingAdSet(optGoal?: string, destType?: string, campaignObj?: string): boolean {
  const dest = (destType || "").toUpperCase();
  const opt = (optGoal || "").toUpperCase();
  
  if (dest.includes("WHATSAPP") || dest.includes("MESSENGER") || dest.includes("INSTAGRAM_DIRECT")) return true;
  if (opt === "CONVERSATIONS") return true;
  
  // Fallback to old objective if those are missing
  return (campaignObj || "").toLowerCase().includes("message");
}

export function generateRecommendations(
  adSets: AdSetStats[],
  seasonalLookup: SeasonalLookup,
  currentMonth: number
) {
  const brandGroups: Record<string, AdSetStats[]> = {};
  for (const adset of adSets) {
    if (!brandGroups[adset.brandId]) brandGroups[adset.brandId] = [];
    brandGroups[adset.brandId].push(adset);
  }

  const recommendations = [];

  for (const [brandId, brandAdSets] of Object.entries(brandGroups)) {
    // Group by goal
    const isReach = (obj?: string) => {
      const o = (obj || "").toLowerCase();
      return o.includes("reach") || o.includes("awareness");
    };
    const isLinkClick = (obj?: string) => {
      const o = (obj || "").toLowerCase();
      return o.includes("link") || o.includes("traffic");
    };

    const messagingAdSets = brandAdSets.filter(a => isMessagingAdSet(a.optimizationGoal, a.destinationType, a.objective));
    const reachAdSets = brandAdSets.filter(a => isReach(a.objective) && !isMessagingAdSet(a.optimizationGoal, a.destinationType, a.objective));
    const linkClickAdSets = brandAdSets.filter(a => isLinkClick(a.objective) && !isMessagingAdSet(a.optimizationGoal, a.destinationType, a.objective));
    const otherAdSets = brandAdSets.filter(a => !isReach(a.objective) && !isLinkClick(a.objective) && !isMessagingAdSet(a.optimizationGoal, a.destinationType, a.objective));

    // Handle REACH
    for (const adset of reachAdSets) {
      recommendations.push({
        brandId: adset.brandId,
        adSetId: adset.adSetId,
        costPerGenuine: 0,
        costPerSale: null,
        action: "NOT_RATED",
        reason: "Awareness campaign (Reach)"
      });
    }

    // Handle OTHER
    for (const adset of otherAdSets) {
      recommendations.push({
        brandId: adset.brandId,
        adSetId: adset.adSetId,
        costPerGenuine: 0,
        costPerSale: null,
        action: "NOT_RATED",
        reason: `Not rated - Goal: ${adset.objective || "Unknown"}`
      });
    }

    // Helper for generating terciles and seasonal logic
    const rankAdSets = (
      group: AdSetStats[],
      costFn: (adset: AdSetStats) => number,
      baseIncreaseReason: string,
      baseDecreaseReason: string
    ) => {
      const annotated = group.map(adset => ({
        ...adset,
        cost: costFn(adset)
      }));

      const active = annotated.filter(a => a.spend > 0);
      active.sort((a, b) => a.cost - b.cost);
      
      const count = active.length;
      const third = Math.floor(count / 3);

      for (let i = 0; i < count; i++) {
        const adset = active[i];
        let action: "INCREASE" | "DECREASE" | "HOLD" | "HOLD_SEASONAL" | "NOT_RATED" | "MIXED_SEASON_REVIEW" = "HOLD";
        let reason = "Average performance";

        // Seasonal Logic
        let seasonalAction: "HOLD_SEASONAL" | "MIXED_SEASON_REVIEW" | null = null;
        if (adset.isSeasonalBrand && adset.products && adset.products.length > 0 && adset.region) {
          let hasValid = false;
          let hasInvalid = false;

          for (const prod of adset.products) {
            const rule = seasonalLookup[prod];
            if (rule) {
              const validRegion = rule.validRegions.includes(adset.region);
              const validMonth = rule.validMonths.includes(currentMonth);
              if (validRegion && validMonth) {
                hasValid = true;
              } else {
                hasInvalid = true;
              }
            }
          }

          if (hasValid && hasInvalid) {
            seasonalAction = "MIXED_SEASON_REVIEW";
          } else if (hasInvalid && !hasValid) {
            seasonalAction = "HOLD_SEASONAL";
          }
        }

        if (seasonalAction === "MIXED_SEASON_REVIEW") {
          action = "MIXED_SEASON_REVIEW";
          reason = "Products have different seasons; mixed season review required";
        } else if (seasonalAction === "HOLD_SEASONAL") {
          action = "HOLD_SEASONAL";
          reason = "Outside historically valid month/region window";
        } else {
          // Terciles
          if (count >= 3) {
            if (i < third) {
              action = "INCREASE";
              reason = baseIncreaseReason;
            } else if (i >= count - third) {
              action = "DECREASE";
              reason = baseDecreaseReason;
            }
          } else {
            reason = "Not enough active adsets in this goal for tercile comparison";
          }
        }

        recommendations.push({
          brandId: adset.brandId,
          adSetId: adset.adSetId,
          costPerGenuine: adset.cost === Infinity ? 0 : adset.cost, // for link clicks we'll repurpose this field or just use cost
          costPerSale: adset.convertedLeads > 0 ? adset.spend / adset.convertedLeads : null,
          action,
          reason
        });
      }

      const inactive = annotated.filter(a => a.spend === 0);
      for (const adset of inactive) {
        recommendations.push({
          brandId: adset.brandId,
          adSetId: adset.adSetId,
          costPerGenuine: 0,
          costPerSale: null,
          action: "HOLD",
          reason: "Zero spend"
        });
      }
    };

    // Rank Messaging
    rankAdSets(
      messagingAdSets,
      (a) => calculateCostPerGenuine(a.spend, a.genuineLeads),
      "Best-performing tercile (Cost per Genuine Lead)",
      "Worst-performing tercile (Cost per Genuine Lead)"
    );

    // Rank Link Clicks
    rankAdSets(
      linkClickAdSets,
      (a) => calculateCostPerClick(a.spend, a.clicks),
      "Best-performing tercile (click cost, not lead quality)",
      "Worst-performing tercile (click cost, not lead quality)"
    );
  }

  return recommendations;
}
