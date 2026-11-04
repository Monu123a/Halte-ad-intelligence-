import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";
import { resolveMetaCampaignBrand } from "@/lib/metaBasicMetrics";
import { getGeographicalReport } from "@/lib/geoIntelligence";
import { extractLeadMetadata } from "@/lib/leadMatcher";

export const dynamic = "force-dynamic";

function parseDateRange(range: string, customStart?: string | null, customEnd?: string | null) {
  const now = new Date();
  let start: Date | null = null;
  let end: Date = new Date();

  if (customStart) {
    start = new Date(customStart.includes("T") ? customStart : `${customStart}T00:00:00.000Z`);
    if (customEnd) {
      end = new Date(customEnd.includes("T") ? customEnd : `${customEnd}T23:59:59.999Z`);
    } else {
      end = new Date();
    }
    return { start, end };
  }

  switch (range) {
    case "today": {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case "yesterday": {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
      break;
    }
    case "7d": {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case "30d": {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    case "this_month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "last_month": {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case "all":
    default:
      start = null;
      break;
  }

  return { start, end };
}

export async function GET(req: Request) {
  let session: any = null;
  try {
    session = await getSession();
  } catch {
    // request scope fallback
  }

  if (!session && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session?.role === "LEAD_TAGGER") {
    return NextResponse.json({ error: "Forbidden: Lead taggers cannot download financial or analytics reports" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "master"; // master | ads_campaigns | geo_performance | web_analytics | leads_crm | executive
  const format = url.searchParams.get("format") || "xlsx"; // xlsx | csv | json
  const range = url.searchParams.get("range") || "all";
  const customStart = url.searchParams.get("startDate") || url.searchParams.get("from");
  const customEnd = url.searchParams.get("endDate") || url.searchParams.get("to");
  const brand = url.searchParams.get("brand") || "ALL";
  const previewOnly = url.searchParams.get("preview") === "true";

  const { start, end } = parseDateRange(range, customStart, customEnd);

  // Common Date Filter Objects
  const dateFilter = start ? { gte: start, lte: end } : undefined;

  // 1. Fetch Campaigns & Ad Sets Data
  const campaigns = await prisma.campaign.findMany({
    include: {
      brand: true,
      adConnection: { select: { platform: true, label: true } },
      adSets: {
        include: {
          dailyMetrics: {
            where: dateFilter ? { date: dateFilter } : undefined
          },
          leads: {
            where: dateFilter ? { createdAt: dateFilter } : undefined
          }
        }
      }
    }
  });

  const campaignsRows: any[] = [];
  const adSetsRows: any[] = [];

  for (const c of campaigns) {
    const resolvedBrand = resolveMetaCampaignBrand(c.name, c.brand?.name);

    if (brand !== "ALL") {
      const target = brand.toLowerCase();
      const b = resolvedBrand.toLowerCase();
      if (target === "halte all") {
        if (!b.includes("halte") && b !== "all") continue;
      } else if (b !== target) {
        continue;
      }
    }

    let campSpend = 0;
    let campImp = 0;
    let campClicks = 0;
    let campLeads = 0;

    for (const a of c.adSets) {
      const aSpend = a.dailyMetrics.reduce((s, m) => s + Number(m.spend || 0), 0);
      const aImp = a.dailyMetrics.reduce((s, m) => s + (m.impressions || 0), 0);
      const aClicks = a.dailyMetrics.reduce((s, m) => s + (m.clicks || 0), 0);
      const aLeads = a.leads.length;
      const genuineLeads = a.leads.filter(l => l.tag === "GENUINE" || l.tag === "CONVERTED").length;
      const convertedLeads = a.leads.filter(l => l.tag === "CONVERTED").length;

      campSpend += aSpend;
      campImp += aImp;
      campClicks += aClicks;
      campLeads += aLeads;

      const ctr = aImp > 0 ? (aClicks / aImp) * 100 : 0;
      const cpc = aClicks > 0 ? aSpend / aClicks : 0;
      const cpl = aLeads > 0 ? aSpend / aLeads : 0;
      const cpgl = genuineLeads > 0 ? aSpend / genuineLeads : 0;

      adSetsRows.push({
        "Ad Set ID": a.platformAdSetId || a.id,
        "Ad Set Name": a.name,
        "Campaign Name": c.name,
        "Meta Campaign ID": c.platformCampaignId || c.id,
        "Brand": resolvedBrand,
        "Platform": c.adConnection?.platform || "META",
        "Optimization Goal": a.optimizationGoal || "N/A",
        "Spend (₹)": Math.round(aSpend),
        "Impressions": aImp,
        "Clicks": aClicks,
        "CTR (%)": Number(ctr.toFixed(2)),
        "CPC (₹)": Number(cpc.toFixed(2)),
        "Total Leads": aLeads,
        "Genuine Leads": genuineLeads,
        "Converted Leads": convertedLeads,
        "CPL (₹)": Math.round(cpl),
        "Cost Per Genuine Lead (₹)": Math.round(cpgl),
        "Tercile Ranking": aSpend > 1000 ? (cpgl > 0 && cpgl < 150 ? "Top 33% (Scale Budget 🚀)" : cpgl <= 300 ? "Mid 33% (Maintain / Test ⚖️)" : "Bottom 33% (Optimize Creative 🔄)") : "Testing Phase"
      });
    }

    const cCtr = campImp > 0 ? (campClicks / campImp) * 100 : 0;
    const cCpc = campClicks > 0 ? campSpend / campClicks : 0;
    const cCpl = campLeads > 0 ? campSpend / campLeads : 0;

    const isBoosted = /instagram|boosted|story/i.test(c.name) || /post_engagement|engagement|video_views/i.test(c.objective || "");
    const deliveryStatus = (campSpend > 0 || campImp > 100)
      ? (isBoosted ? "Boosted Post ⚡" : "Ongoing (Active) 🟢")
      : "Completed ⏸️";

    campaignsRows.push({
      "Meta Campaign ID": c.platformCampaignId || c.id,
      "Campaign Name": c.name,
      "Brand": resolvedBrand,
      "Platform": c.adConnection?.platform || "META",
      "Delivery Status": deliveryStatus,
      "Objective": c.objective || "MESSAGES",
      "Format": c.format || "REEL",
      "Total Spend (₹)": Math.round(campSpend),
      "Impressions": campImp,
      "Clicks": campClicks,
      "CTR (%)": Number(cCtr.toFixed(2)),
      "CPC (₹)": Number(cCpc.toFixed(2)),
      "Leads Captured": campLeads,
      "Cost Per Lead (₹)": Math.round(cCpl)
    });
  }

  // Sort campaigns and ad sets by Spend descending so active items always appear first
  campaignsRows.sort((a, b) => b["Total Spend (₹)"] - a["Total Spend (₹)"] || b["Impressions"] - a["Impressions"]);
  adSetsRows.sort((a, b) => b["Spend (₹)"] - a["Spend (₹)"] || b["Impressions"] - a["Impressions"]);

  // 2. Fetch Geographical Data with dynamic time scaling
  const geoValidRange = (range === "7d" || range === "30d" || range === "90d" || range === "all") ? range : "custom";
  const geoReport = await getGeographicalReport(
    geoValidRange as any,
    brand,
    start ? { from: start, to: end } : undefined
  );

  const geoRows = geoReport.states.map(s => ({
    "State / Territory": s.state,
    "Zone": s.zone,
    "Country": "India",
    "Total Spend (₹)": s.spend,
    "Spend Share (%)": s.nationalSharePct,
    "Ad Inbound Leads": s.leads,
    "WhatsApp CRM Leads": s.whatsAppLeads,
    "Total Combined Leads": s.totalInboundDemand,
    "Cost Per Lead (₹)": s.cpl,
    "Efficiency Rating": s.cplRating,
    "Top Target Districts": s.topDistricts.join(", "),
    "Recommended Products": s.recommendedProducts.join(", ")
  }));

  // 3. Fetch Website Analytics Data with database SQL aggregation
  const webWhereConditions: any[] = [];
  if (start) webWhereConditions.push(Prisma.sql`"createdAt" >= ${start} AND "createdAt" <= ${end}`);
  if (brand !== "ALL") webWhereConditions.push(Prisma.sql`"brand" ILIKE ${'%' + brand + '%'}`);

  const webWhereClause = webWhereConditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(webWhereConditions, ' AND ')}`
    : Prisma.empty;

  const webAggRows: any[] = await prisma.$queryRaw`
    SELECT 
      "pagePath" AS "Page Path",
      COALESCE("brand", 'Halte') AS "Brand",
      COALESCE("category", 'General') AS "Category",
      COUNT(*)::int AS "Total Pageviews",
      ROUND(COALESCE(SUM("timeSpentSec"), 0))::int AS "Total Time Spent (sec)",
      ROUND(COALESCE(AVG("timeSpentSec"), 0))::int AS "Avg Time on Page (sec)",
      COUNT(*) FILTER (WHERE "isExit")::int AS "Exits",
      ROUND((COUNT(*) FILTER (WHERE "isExit")::numeric / NULLIF(COUNT(*), 0)) * 100, 1)::float AS "Exit Rate (%)"
    FROM "WebsiteAnalytics"
    ${webWhereClause}
    GROUP BY "pagePath", "brand", "category"
    ORDER BY "Total Pageviews" DESC
    LIMIT 500
  `;

  const webPagesRows = webAggRows.map(r => ({
    "Page Path": r["Page Path"],
    "Brand": r["Brand"],
    "Category": r["Category"],
    "Total Pageviews": Number(r["Total Pageviews"] || 0),
    "Total Time Spent (sec)": Number(r["Total Time Spent (sec)"] || 0),
    "Avg Time on Page (sec)": Number(r["Avg Time on Page (sec)"] || 0),
    "Exits": Number(r["Exits"] || 0),
    "Exit Rate (%)": Number(r["Exit Rate (%)"] || 0)
  }));

  // 4. Fetch CRM Leads Data
  const leadsWhere: any = {};
  if (dateFilter) leadsWhere.createdAt = dateFilter;

  const leads = await prisma.lead.findMany({
    where: leadsWhere,
    include: {
      adSet: {
        include: {
          campaign: {
            include: { brand: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const leadsRows = leads
    .map(l => {
      const meta = extractLeadMetadata(l.messageText, l.contactRef);
      const messages = l.messageText ? l.messageText.split("\n---\n") : [];
      const latestMsg = messages.length > 0 ? messages[messages.length - 1] : (l.messageText || "");
      const leadBrand = l.adSet?.campaign?.brand?.name || meta.brand || "Halte All";

      return {
        "Lead ID": l.id,
        "Contact / Name": l.contactRef,
        "Phone Number": l.phoneRaw || meta.phoneRaw || "",
        "Receiving Channel": l.instance || meta.phoneInstance || "WhatsApp Phone 1",
        "Platform Source": l.platform || meta.platform || "WhatsApp Direct",
        "Account / Handle": l.accountName || meta.accountName || "",
        "Brand": leadBrand,
        "Linked Campaign": l.adSet?.campaign?.name || "Direct / Web",
        "Linked Ad Set": l.adSet?.name || "Unassigned",
        "State / Region": meta.state || "National",
        "Messages Received": l.messagesCount || (messages.length > 0 ? messages.length : 1),
        "Tag Status": l.tag,
        "Latest Message": latestMsg,
        "Date": new Date(l.updatedAt || l.createdAt).toLocaleDateString(),
        "Time": new Date(l.updatedAt || l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
    })
    .filter(l => {
      if (brand === "ALL") return true;
      const b = (l["Brand"] || "").toLowerCase();
      const target = brand.toLowerCase();
      if (target === "halte all") return b.includes("halte") || b === "all";
      return b === target;
    });

  // 5. Executive Overview Summary Rows
  const totalSpend = campaignsRows.reduce((s, c) => s + c["Total Spend (₹)"], 0);
  const totalImp = campaignsRows.reduce((s, c) => s + c["Impressions"], 0);
  const totalClicks = campaignsRows.reduce((s, c) => s + c["Clicks"], 0);
  const totalLeads = leadsRows.length;
  const genuineLeads = leadsRows.filter(l => l["Tag Status"] === "GENUINE" || l["Tag Status"] === "CONVERTED").length;
  const convertedLeads = leadsRows.filter(l => l["Tag Status"] === "CONVERTED").length;
  const spamLeads = leadsRows.filter(l => l["Tag Status"] === "SPAM").length;

  const appliedDateStr = start
    ? `${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`
    : "All Historical Time";

  const executiveRows = [
    { "Metric": "Total Advertising Spend", "Value": `₹${totalSpend.toLocaleString()}` },
    { "Metric": "Total Ad Impressions", "Value": totalImp.toLocaleString() },
    { "Metric": "Total Ad Clicks", "Value": totalClicks.toLocaleString() },
    { "Metric": "Overall CTR", "Value": totalImp > 0 ? `${((totalClicks / totalImp) * 100).toFixed(2)}%` : "0%" },
    { "Metric": "Overall Average CPC", "Value": totalClicks > 0 ? `₹${(totalSpend / totalClicks).toFixed(2)}` : "₹0" },
    { "Metric": "Total Inbound Leads", "Value": totalLeads.toLocaleString() },
    { "Metric": "Genuine / Qualified Leads", "Value": genuineLeads.toLocaleString() },
    { "Metric": "Converted Customer Sales", "Value": convertedLeads.toLocaleString() },
    { "Metric": "Spam Leads Filtered", "Value": spamLeads.toLocaleString() },
    { "Metric": "Cost Per Inbound Lead (CPL)", "Value": totalLeads > 0 ? `₹${Math.round(totalSpend / totalLeads)}` : "₹0" },
    { "Metric": "Cost Per Genuine Lead (CPGL)", "Value": genuineLeads > 0 ? `₹${Math.round(totalSpend / genuineLeads)}` : "₹0" },
    { "Metric": "Total Website Recorded Pages", "Value": webPagesRows.length.toLocaleString() },
    { "Metric": "Active Geographic Regions", "Value": geoRows.length.toString() },
    { "Metric": "Date Range Filter Applied", "Value": appliedDateStr },
    { "Metric": "Brand Filter Applied", "Value": brand }
  ];

  // If preview requested, return sample JSON
  if (previewOnly) {
    let previewData: any[] = [];
    switch (type) {
      case "ads_campaigns": previewData = campaignsRows.slice(0, 20); break;
      case "adsets": previewData = adSetsRows.slice(0, 20); break;
      case "geo_performance": previewData = geoRows.slice(0, 20); break;
      case "web_analytics": previewData = webPagesRows.slice(0, 20); break;
      case "leads_crm": previewData = leadsRows.slice(0, 20); break;
      case "executive":
      default:
        previewData = executiveRows;
        break;
    }
    return NextResponse.json({
      success: true,
      type,
      totalCount: previewData.length,
      sample: previewData
    });
  }

  // Handle CSV format download
  if (format === "csv") {
    let csvData: any[] = [];
    let filename = `halte_${type}_report_${range}.csv`;

    switch (type) {
      case "ads_campaigns": csvData = campaignsRows; break;
      case "adsets": csvData = adSetsRows; break;
      case "geo_performance": csvData = geoRows; break;
      case "web_analytics": csvData = webPagesRows; break;
      case "leads_crm": csvData = leadsRows; break;
      case "executive":
      default:
        csvData = executiveRows;
        break;
    }

    const ws = XLSX.utils.json_to_sheet(csvData);
    const csvContent = XLSX.utils.sheet_to_csv(ws);

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  }

  // Handle JSON format download
  if (format === "json") {
    let jsonData: any = {};
    if (type === "master") {
      jsonData = {
        executive: executiveRows,
        campaigns: campaignsRows,
        adSets: adSetsRows,
        geo: geoRows,
        websitePages: webPagesRows,
        leads: leadsRows
      };
    } else {
      switch (type) {
        case "ads_campaigns": jsonData = campaignsRows; break;
        case "adsets": jsonData = adSetsRows; break;
        case "geo_performance": jsonData = geoRows; break;
        case "web_analytics": jsonData = webPagesRows; break;
        case "leads_crm": jsonData = leadsRows; break;
        default: jsonData = executiveRows; break;
      }
    }

    return new Response(JSON.stringify(jsonData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="halte_${type}_report_${range}.json"`
      }
    });
  }

  // Handle Excel (.xlsx) format download
  const wb = XLSX.utils.book_new();

  if (type === "master") {
    // Add all 5 sheets
    const wsExec = XLSX.utils.json_to_sheet(executiveRows);
    wsExec["!cols"] = [{ wch: 35 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsExec, "Executive Overview");

    const wsCamp = XLSX.utils.json_to_sheet(campaignsRows);
    wsCamp["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsCamp, "Campaigns");

    const wsAdSets = XLSX.utils.json_to_sheet(adSetsRows);
    wsAdSets["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsAdSets, "Ad Sets Detailed");

    const wsGeo = XLSX.utils.json_to_sheet(geoRows);
    wsGeo["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsGeo, "State Geo Breakdown");

    const wsWeb = XLSX.utils.json_to_sheet(webPagesRows);
    wsWeb["!cols"] = [{ wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsWeb, "Website Analytics");

    const wsLeads = XLSX.utils.json_to_sheet(leadsRows);
    wsLeads["!cols"] = [{ wch: 15 }, { wch: 24 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 30 }, { wch: 25 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 45 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsLeads, "CRM Inbound Leads");
  } else {
    let sheetData: any[] = [];
    let sheetName = "Report";

    switch (type) {
      case "ads_campaigns":
        sheetData = campaignsRows;
        sheetName = "Campaigns";
        break;
      case "adsets":
        sheetData = adSetsRows;
        sheetName = "Ad Sets";
        break;
      case "geo_performance":
        sheetData = geoRows;
        sheetName = "Geo States";
        break;
      case "web_analytics":
        sheetData = webPagesRows;
        sheetName = "Web Analytics";
        break;
      case "leads_crm":
        sheetData = leadsRows;
        sheetName = "Leads CRM";
        break;
      default:
        sheetData = executiveRows;
        sheetName = "Overview";
        break;
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = type === "master" 
    ? `halte_master_bi_report_${range}.xlsx`
    : `halte_${type}_report_${range}.xlsx`;

  return new Response(excelBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
