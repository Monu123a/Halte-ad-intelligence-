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

  for (const r of rows) {
    // Helper to find column case-insensitively
    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== "") return r[k];
        const lowerKey = k.toLowerCase();
        for (const actualKey of Object.keys(r)) {
          if (actualKey.toLowerCase().trim() === lowerKey || actualKey.toLowerCase().includes(lowerKey)) {
            if (r[actualKey] !== undefined && r[actualKey] !== "") return r[actualKey];
          }
        }
      }
      return null;
    };

    const campaignName = getVal("Campaign Name", "Campaign", "campaignName");
    if (!campaignName) continue; // Skip rows without campaign name

    // Parse date
    const dateRaw = getVal("Date", "Day", "Report Date");
    let rowDate = new Date();
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d.getTime())) {
        rowDate = d;
      }
    }

    const campaignType = getVal("Type", "Campaign Type", "Targeting Type") || "Sponsored Products";
    const status = getVal("Status", "Campaign Status") || "ENABLED";

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
    const orders = Math.round(cleanNum(getVal("7 Day Total Orders", "14 Day Total Orders", "Total Orders", "Orders")));
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
  
  const productToBrandMap = new Map<string, string>();
  history.forEach(h => {
    if (h.subCategory && h.brand) productToBrandMap.set(h.subCategory.toLowerCase(), h.brand);
  });

  // 3. Group rows by campaign
  const campaignNames = Array.from(new Set(rows.map(r => r.campaignName)));

  for (const cName of campaignNames) {
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
    const cleanId = cName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase().substring(0, 40);
    const platformCampaignId = `amz_${cleanId}`;

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
  }

  return {
    connectionId: conn.id,
    campaignsCount: campaignNames.length,
    rowsIngested: rows.length
  };
}
