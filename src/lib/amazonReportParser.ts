import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";

export interface ParsedAmazonRow {
  date: Date;
  campaignName: string;
  campaignType: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  orders: number;
  sales: number;
  acos: number | null;
  roas: number | null;
  raw: any;
}

export function parseAmazonReportBuffer(buffer: Buffer): ParsedAmazonRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const parsed: ParsedAmazonRow[] = [];
  const now = new Date();

  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const r of rows) {
    const rowKeys = Object.keys(r);

    // Multi-tiered column lookup: 1) Exact key, 2) Exact normalized, 3) StartsWith / Contains
    const getVal = (...keys: string[]) => {
      // 1. Exact match
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== "") return r[k];
      }
      // 2. Exact normalized match (ignoring spaces, casing, punctuation)
      for (const k of keys) {
        const normK = normalize(k);
        for (const rk of rowKeys) {
          if (normalize(rk) === normK) {
            if (r[rk] !== undefined && r[rk] !== "") return r[rk];
          }
        }
      }
      // 3. Prefix or contains match (e.g. "Spend (INR)" matches "Spend")
      for (const k of keys) {
        const normK = normalize(k);
        for (const rk of rowKeys) {
          const normRk = normalize(rk);
          if (normRk.startsWith(normK) || normRk.endsWith(normK) || normRk.includes(normK)) {
            if (r[rk] !== undefined && r[rk] !== "") return r[rk];
          }
        }
      }
      return null;
    };

    const campaignName = getVal("Campaign Name", "Campaign name", "Campaign", "campaignName");
    if (!campaignName) continue; // Skip rows without campaign name

    // Parse date (supports Date object, Excel serial number, or date string - strictly for daily breakdown, NOT campaign start date)
    const getDateRaw = () => {
      for (const k of ["Date", "Day", "Report Date"]) {
        if (r[k] !== undefined && r[k] !== "") return r[k];
      }
      for (const rk of rowKeys) {
        const normRk = normalize(rk);
        if (normRk === "date" || normRk === "day" || normRk === "reportdate") {
          if (r[rk] !== undefined && r[rk] !== "") return r[rk];
        }
      }
      return null;
    };
    const dateRaw = getDateRaw();
    let rowDate = new Date();
    if (dateRaw) {
      if (typeof dateRaw === "number" && dateRaw > 20000 && dateRaw < 70000) {
        // Excel serial date format
        rowDate = new Date((dateRaw - 25569) * 86400 * 1000);
      } else if (typeof dateRaw === "string") {
        const trimmed = dateRaw.trim();
        const parts = trimmed.split(/[\/\-\.]/);
        if (parts.length === 3 && parts[2].length === 4 && parseInt(parts[0], 10) > 12) {
          // DD/MM/YYYY format
          rowDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        } else {
          const d = new Date(trimmed);
          if (!isNaN(d.getTime())) {
            rowDate = d;
          }
        }
      } else if (dateRaw instanceof Date && !isNaN(dateRaw.getTime())) {
        rowDate = dateRaw;
      }
    }

    const campaignType = getVal("Type", "Campaign Type", "Targeting Type") || "Sponsored Products";
    const status = getVal("Status", "Campaign Status", "State") || "ENABLED";

    const cleanNum = (val: any) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      const cleaned = String(val).replace(/[^0-9.-]/g, "");
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    };

    const impressions = Math.round(cleanNum(getVal("Impressions", "Impression")));
    const clicks = Math.round(cleanNum(getVal("Clicks", "Click")));
    const spend = cleanNum(getVal("Spend", "Cost"));
    const orders = Math.round(cleanNum(getVal("7 Day Total Orders", "14 Day Total Orders", "Total Orders", "Orders", "Units")));
    const sales = cleanNum(getVal("7 Day Total Sales", "14 Day Total Sales", "Total Sales", "Sales"));

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : cleanNum(getVal("CTR", "Click-Through Rate"));
    const cpc = clicks > 0 ? spend / clicks : cleanNum(getVal("CPC", "Cost Per Click"));
    const acos = sales > 0 ? (spend / sales) * 100 : cleanNum(getVal("ACOS"));
    const roas = spend > 0 ? sales / spend : cleanNum(getVal("ROAS"));

    parsed.push({
      date: rowDate,
      campaignName: String(campaignName).trim(),
      campaignType: String(campaignType).trim(),
      status: String(status).toUpperCase(),
      impressions,
      clicks,
      spend,
      ctr: Math.round(ctr * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      orders,
      sales: Math.round(sales * 100) / 100,
      acos: acos ? Math.round(acos * 10) / 10 : null,
      roas: roas ? Math.round(roas * 10) / 10 : null,
      raw: r
    });
  }

  return parsed;
}

export async function ingestAmazonReportRows(rows: ParsedAmazonRow[], sourceLabel = "Amazon Store (Report Ingestion)") {
  if (rows.length === 0) {
    throw new Error("No valid campaign rows found in the report");
  }

  // 1. Ensure Amazon AdConnection exists
  const conn = await prisma.adConnection.upsert({
    where: { platformAccountId: "amz_in_store" },
    update: {
      status: "CONNECTED",
      isEnabled: true,
      lastSyncedAt: new Date(),
      label: sourceLabel,
      platform: "AMAZON"
    },
    create: {
      platformAccountId: "amz_in_store",
      label: sourceLabel,
      platform: "AMAZON",
      status: "CONNECTED",
      isEnabled: true,
      accessTokenEnc: "manual_ingestion_active",
      lastSyncedAt: new Date()
    }
  });

  // 2. Prepare Brand Mapping Lookups
  const brands = await prisma.brand.findMany();
  const history = await prisma.salesHistory.findMany({
    select: { brand: true, subCategory: true }
  });
  
  const defaultCategoryBrandMap: Record<string, string> = {
    brushcutter: "BKR",
    chainsaw: "BKR",
    lawnmower: "BKR",
    fogger: "BKR",
    trimmer: "BKR",
    trimmerline: "BKR",
    cutter: "BKR",
    tiller: "BKR",
    bkr: "BKR",
    gardena: "Gardena",
    hose: "Gardena",
    hosereel: "Gardena",
    hosecart: "Gardena",
    hosestand: "Gardena",
    sprayer: "Gardena",
    watering: "Gardena",
    velcro: "Velcro",
    mountingtape: "Velcro",
    cord: "Velcro",
    gorilla: "Gorilla",
  };

  const productToBrandMap = new Map<string, string>(Object.entries(defaultCategoryBrandMap));
  history.forEach(h => {
    if (h.subCategory && h.brand) productToBrandMap.set(h.subCategory.toLowerCase(), h.brand);
  });

  // Helper for bounded parallel execution
  const pMap = async <T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 12): Promise<R[]> => {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);
      const chunkRes = await Promise.all(chunk.map(fn));
      results.push(...chunkRes);
    }
    return results;
  };

  // 3. Group rows by campaign
  const campaignNames = Array.from(new Set(rows.map(r => r.campaignName)));

  await pMap(campaignNames, async (cName) => {
    const cRows = rows.filter(r => r.campaignName === cName);
    const searchString = cName.toLowerCase();
    let detectedBrand: string | null = null;
    const matchedProducts = new Set<string>();

    for (const [product, brandName] of Array.from(productToBrandMap.entries())) {
      if (searchString.includes(product)) {
        detectedBrand = brandName;
        matchedProducts.add(product);
      }
    }

    for (const b of brands) {
      if (searchString.includes(b.name.toLowerCase())) {
        detectedBrand = b.name;
      }
    }

    const brandObj = detectedBrand ? brands.find(b => b.name === detectedBrand) : null;
    const rawCampId = cRows[0].raw?.["Campaign ID"] || cRows[0].raw?.["Campaign Id"] || cRows[0].raw?.["campaignId"];
    const nameHash = Buffer.from(cName).toString("hex").slice(0, 8);
    const cleanId = cName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase().substring(0, 45);
    const platformCampaignId = rawCampId ? `amz_${rawCampId}` : `amz_${cleanId}_${nameHash}`;

    // Upsert Campaign
    const campaign = await prisma.campaign.upsert({
      where: { platformCampaignId },
      update: {
        name: cName,
        objective: cRows[0].campaignType,
        brandPageId: brandObj?.pageId,
        products: Array.from(matchedProducts)
      },
      create: {
        platformCampaignId,
        name: cName,
        objective: cRows[0].campaignType,
        format: cRows[0].campaignType,
        adConnectionId: conn.id,
        brandPageId: brandObj?.pageId,
        products: Array.from(matchedProducts)
      }
    });

    // Upsert Default Ad Set for this campaign
    const platformAdSetId = `amz_adset_${cleanId}`;
    const adSet = await prisma.adSet.upsert({
      where: { platformAdSetId },
      update: { name: `${cName} (Ad Group)` },
      create: {
        platformAdSetId,
        name: `${cName} (Ad Group)`,
        campaignId: campaign.id
      }
    });

    // Upsert Daily Metrics for this campaign
    for (const r of cRows) {
      const metricDate = new Date(r.date.getFullYear(), r.date.getMonth(), r.date.getDate());
      await prisma.dailyMetric.upsert({
        where: {
          adSetId_date: {
            adSetId: adSet.id,
            date: metricDate
          }
        },
        update: {
          spend: r.spend,
          impressions: r.impressions,
          clicks: r.clicks,
          rawResponse: {
            orders: r.orders,
            sales: r.sales,
            acos: r.acos,
            roas: r.roas,
            conversions: r.orders,
            source: "amazon_report"
          }
        },
        create: {
          adSetId: adSet.id,
          date: metricDate,
          spend: r.spend,
          impressions: r.impressions,
          clicks: r.clicks,
          rawResponse: {
            orders: r.orders,
            sales: r.sales,
            acos: r.acos,
            roas: r.roas,
            conversions: r.orders,
            source: "amazon_report"
          }
        }
      });
    }
  }, 12);

  return {
    connectionId: conn.id,
    campaignsCount: campaignNames.length,
    rowsIngested: rows.length
  };
}
