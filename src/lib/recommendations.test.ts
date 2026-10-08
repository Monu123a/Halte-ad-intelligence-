import { test, describe } from "node:test";
import * as assert from "node:assert";
import { generateRecommendations, calculateCostPerGenuine, AdSetStats, SeasonalLookup } from "./recommendations";

describe("recommendation math", () => {
  test("calculates cost per genuine correctly", () => {
    assert.strictEqual(calculateCostPerGenuine(1000, 10), 100);
    assert.strictEqual(calculateCostPerGenuine(1000, 0), Infinity);
    assert.strictEqual(calculateCostPerGenuine(0, 0), 0);
  });

  test("generates tercile rankings correctly", () => {
    const adSets: AdSetStats[] = [
      { adSetId: "1", spend: 1000, genuineLeads: 100, convertedLeads: 0, brandId: "brandA", isSeasonalBrand: false }, // cpgl = 10
      { adSetId: "2", spend: 1000, genuineLeads: 50, convertedLeads: 0, brandId: "brandA", isSeasonalBrand: false },  // cpgl = 20
      { adSetId: "3", spend: 1000, genuineLeads: 20, convertedLeads: 0, brandId: "brandA", isSeasonalBrand: false },  // cpgl = 50
    ];
    
    const recs = generateRecommendations(adSets, {}, 1);
    
    // 3 items -> third = 1.
    // Index 0 (<1) -> INCREASE (adSet 1)
    // Index 1 (>=1 and <2) -> HOLD (adSet 2)
    // Index 2 (>=2) -> DECREASE (adSet 3)
    
    assert.strictEqual(recs.find(r => r.adSetId === "1")?.action, "INCREASE");
    assert.strictEqual(recs.find(r => r.adSetId === "2")?.action, "HOLD");
    assert.strictEqual(recs.find(r => r.adSetId === "3")?.action, "DECREASE");
  });

  test("applies seasonal holding correctly", () => {
    const adSets: AdSetStats[] = [
      { adSetId: "1", spend: 100, genuineLeads: 100, convertedLeads: 0, brandId: "brandA", isSeasonalBrand: true, product: "Snow Chains", region: "South" },
    ];
    
    const lookup: SeasonalLookup = {
      "Snow Chains": {
        validRegions: ["North"],
        validMonths: [11, 12, 1, 2]
      }
    };
    
    // Month 1, Region South -> invalid region
    const recs1 = generateRecommendations(adSets, lookup, 1);
    assert.strictEqual(recs1[0].action, "HOLD_SEASONAL");
    
    // Valid region, invalid month (Month 6)
    adSets[0].region = "North";
    const recs2 = generateRecommendations(adSets, lookup, 6);
    assert.strictEqual(recs2[0].action, "HOLD_SEASONAL");
  });
});
