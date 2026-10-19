import { resolvePhoneState } from "@/lib/geoIntelligence";

export interface DetectedLeadMetadata {
  platform: "Facebook Ad" | "Instagram Ad" | "Halte.in Web" | "WhatsApp Direct";
  brand: "BKR" | "Gardena" | "Gorilla" | "Velcro" | "Halte All" | "Halte Complete" | null;
  product: string | null;
  phoneInstance: string | null;
  accountName: string | null;
  phoneRaw: string | null;
  state: string | null;
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits.length > 0 ? digits : null;
}

const PRODUCT_DEFINITIONS: Array<{ name: string; keywords: string[] }> = [
  { name: "Lawn Mowers", keywords: ["lawn mower", "mower", "grass cutting", "grass cutter", "lg0862"] },
  { name: "Chainsaw", keywords: ["chainsaw", "wood cutter", "chain saw", "lg0543", "lg1012", "cs-5800"] },
  { name: "Brush Cutters", keywords: ["brush cutter", "brushcutter", "bc-1800", "lg0636", "lg1155"] },
  { name: "Tillers", keywords: ["tiller", "cultivator", "petrol tiller", "lg0568"] },
  { name: "Trimmers", keywords: ["hedge trimmer", "trimmer", "hte-600", "lg0637", "pruner", "pruning"] },
  { name: "Fogging Machine", keywords: ["fogging", "fogger"] },
  { name: "Hose Reels", keywords: ["hose reel", "rollup", "hose", "pipe", "reel"] },
  { name: "Sprinklers", keywords: ["sprinkler", "aquazoom", "watering"] },
  { name: "Drip irrigation", keywords: ["drip", "micro-drip", "irrigation"] },
  { name: "Combisystem", keywords: ["combisystem", "combisytem"] },
  { name: "Hand Tools", keywords: ["hand tool", "secateurs", "trowel", "rake"] },
  { name: "Glues", keywords: ["glue", "super glue", "gorilla glue", "adhesive"] },
  { name: "Velcro Tapes", keywords: ["velcro", "fastener", "hook and loop", "one-wrap"] },
  { name: "Waterproof Tape", keywords: ["waterproof tape", "seal tape", "mounting tape", "heavy duty tape"] },
  { name: "Snow Chains", keywords: ["snow chain", "chains"] },
  { name: "BBQ", keywords: ["bbq", "barbecue", "grill"] },
  { name: "Firepit", keywords: ["firepit", "fire pit"] },
  { name: "Gensets", keywords: ["genset", "generator"] },
  { name: "Portable Sprayers", keywords: ["sprayer", "pressure sprayer"] }
];

export function extractLeadMetadata(
  text: string | null | undefined,
  contactRef?: string | null | undefined
): DetectedLeadMetadata {
  const lower = (text || "").toLowerCase();
  const rawText = text || "";

  // 1. Phone Instance (e.g. Phone 1, Phone 2, Website)
  const hasPhone1 = /\[(phone_1|phone 1)\]/i.test(rawText);
  const hasPhone2 = /\[(phone_2|phone 2)\]/i.test(rawText);
  
  let phoneInstance: string | null = null;
  if (hasPhone1 && hasPhone2) {
    phoneInstance = "Phone 1 & Phone 2";
  } else if (hasPhone1) {
    phoneInstance = "Phone 1";
  } else if (hasPhone2) {
    phoneInstance = "Phone 2";
  } else {
    const genericMatch = rawText.match(/^\[([^\]]+)\]/);
    if (genericMatch) {
      phoneInstance = genericMatch[1].replace(/_/g, " ").trim();
    }
  }

  // 2. Platform
  let platform: DetectedLeadMetadata["platform"] = "WhatsApp Direct";
  if (lower.includes("saw your ad on facebook") || lower.includes("from facebook") || lower.includes("fb ad")) {
    platform = "Facebook Ad";
  } else if (lower.includes("saw your ad on instagram") || lower.includes("from instagram") || lower.includes("ig ad")) {
    platform = "Instagram Ad";
  } else if (lower.includes("[website") || lower.includes("halte.in")) {
    platform = "Halte.in Web";
  }

  // 3. Brand
  let brand: DetectedLeadMetadata["brand"] = null;
  if (lower.includes("bkr")) {
    brand = "BKR";
  } else if (lower.includes("gardena")) {
    brand = "Gardena";
  } else if (lower.includes("gorilla")) {
    brand = "Gorilla";
  } else if (lower.includes("velcro")) {
    brand = "Velcro";
  } else if (lower.includes("halte")) {
    brand = "Halte All";
  }

  // 4. Product
  let product: string | null = null;
  for (const def of PRODUCT_DEFINITIONS) {
    if (def.keywords.some(k => lower.includes(k))) {
      product = def.name;
      break;
    }
  }

  // Brand inference from product if brand was not directly stated
  if (!brand && product) {
    if (["Lawn Mowers", "Chainsaw", "Brush Cutters", "Tillers", "Trimmers", "Fogging Machine"].includes(product)) {
      brand = "BKR";
    } else if (["Hose Reels", "Sprinklers", "Drip irrigation", "Combisystem", "Hand Tools"].includes(product)) {
      brand = "Gardena";
    } else if (["Glues"].includes(product)) {
      brand = "Gorilla";
    } else if (["Velcro Tapes"].includes(product)) {
      brand = "Velcro";
    }
  }

  // Fallback to Halte All if no specific brand was detected
  if (!brand) {
    brand = "Halte All";
  }

  // 5. Account Name Attribution (which Instagram handle / Facebook page / WhatsApp number)
  let accountName: string | null = null;
  if (platform === "Instagram Ad") {
    if (brand === "Gardena") accountName = "@gardena.india";
    else if (brand === "BKR") accountName = "@bkr.machine";
    else if (brand === "Gorilla") accountName = "@gorillaglue.in";
    else if (brand === "Velcro") accountName = "@velcro.india";
    else accountName = "@halte.in";
  } else if (platform === "Facebook Ad") {
    if (brand === "Gardena") accountName = "Gardena India";
    else if (brand === "BKR") accountName = "BKR Engineering";
    else if (brand === "Gorilla") accountName = "Gorilla Glue India";
    else accountName = "HALTE India";
  } else if (phoneInstance) {
    accountName = `WhatsApp (${phoneInstance})`;
  }

  const phoneRaw = normalizePhone(contactRef);

  return {
    platform,
    brand,
    product,
    phoneInstance,
    accountName,
    phoneRaw,
    state: resolvePhoneState(contactRef)
  };
}


export function matchLeadToAdSet(
  text: string | null | undefined,
  adSets: Array<{
    id: string;
    name: string;
    campaign: {
      name: string;
      products?: string[];
      brand: { id: string; name: string } | null;
    };
  }>
): {
  adSetId: string | null;
  metadata: DetectedLeadMetadata;
} {
  const meta = extractLeadMetadata(text);
  if (!text) {
    return { adSetId: null, metadata: meta };
  }

  const lower = text.toLowerCase();
  let matchedAdSet: (typeof adSets)[0] | undefined;

  // 1. Precise match: Brand + Product
  if (meta.brand && meta.product) {
    matchedAdSet = adSets.find(a => {
      const brandMatch = a.campaign?.brand?.name === meta.brand;
      if (!brandMatch) return false;

      const adSetName = a.name.toLowerCase();
      const campName = a.campaign?.name?.toLowerCase() || "";
      const prodLower = meta.product!.toLowerCase();

      return (
        adSetName.includes(prodLower) ||
        campName.includes(prodLower) ||
        (a.campaign?.products && a.campaign.products.includes(meta.product!))
      );
    });
  }

  // 2. Match by Product across any campaign of that brand
  if (!matchedAdSet && meta.product) {
    matchedAdSet = adSets.find(a => {
      const adSetName = a.name.toLowerCase();
      const campName = a.campaign?.name?.toLowerCase() || "";
      const prodLower = meta.product!.toLowerCase();

      return (
        adSetName.includes(prodLower) ||
        campName.includes(prodLower) ||
        (a.campaign?.products && a.campaign.products.includes(meta.product!))
      );
    });
  }

  // 3. Fallback: Match by Brand to active Messaging or Sales ad set
  if (!matchedAdSet && meta.brand) {
    matchedAdSet =
      adSets.find(a => {
        const brandMatch = a.campaign?.brand?.name === meta.brand;
        if (!brandMatch) return false;
        const name = (a.name + " " + a.campaign?.name).toLowerCase();
        return name.includes("whats app") || name.includes("sales") || name.includes("max");
      }) ||
      adSets.find(a => a.campaign?.brand?.name === meta.brand);
  }

  return {
    adSetId: matchedAdSet ? matchedAdSet.id : null,
    metadata: meta
  };
}
