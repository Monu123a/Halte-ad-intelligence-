import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function parseDateRange(range: string, customStart?: string | null, customEnd?: string | null) {
  const now = new Date();
  let start: Date | null = null;
  let end: Date = new Date();

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
    case "custom": {
      if (customStart) start = new Date(customStart);
      if (customEnd) {
        const d = new Date(customEnd);
        d.setHours(23, 59, 59, 999);
        end = d;
      }
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role === "LEAD_TAGGER") {
    return NextResponse.json({ error: "Forbidden: Lead taggers cannot download financial or analytics reports" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "master"; // master | ads_campaigns | geo_performance | web_analytics | leads_crm | executive
  const format = url.searchParams.get("format") || "xlsx"; // xlsx | csv | json
  const range = url.searchParams.get("range") || "all";
  const customStart = url.searchParams.get("startDate");
  const customEnd = url.searchParams.get("endDate");
  const brand = url.searchParams.get("brand") || "ALL";
  const previewOnly = url.searchParams.get("preview") === "true";

  const { start, end } = parseDateRange(range, customStart, customEnd);

  // Common Date Filter Objects
  const dateFilter = start ? { gte: start, lte: end } : undefined;

  // 1. Fetch Campaigns & Ad Sets Data
  const campaignsWhere: any = {};
  if (brand !== "ALL") {
    campaignsWhere.brand = { name: { contains: brand, mode: "insensitive" } };
  }

  const campaigns = await prisma.campaign.findMany({
    where: campaignsWhere,
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
        "Ad Set ID": a.id,
        "Ad Set Name": a.name,
        "Campaign Name": c.name,
        "Brand": c.brand?.name || "Halte All",
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
        "Cost Per Genuine Lead (₹)": Math.round(cpgl)
      });
    }

    const cCtr = campImp > 0 ? (campClicks / campImp) * 100 : 0;
    const cCpc = campClicks > 0 ? campSpend / campClicks : 0;
    const cCpl = campLeads > 0 ? campSpend / campLeads : 0;

    campaignsRows.push({
      "Campaign ID": c.id,
      "Campaign Name": c.name,
      "Brand": c.brand?.name || "Halte All",
      "Platform": c.adConnection?.platform || "META",
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

  // 2. Fetch Geographical Data
  const geoMetrics = await prisma.geoMetric.findMany({
    where: dateFilter ? { date: dateFilter } : undefined,
    orderBy: { spend: "desc" }
  });

  // Group geoMetrics by state/region
  const geoMap = new Map<string, { spend: number; imp: number; clicks: number; leads: number }>();
  for (const g of geoMetrics) {
    const r = g.region || "Unknown";
    const existing = geoMap.get(r) || { spend: 0, imp: 0, clicks: 0, leads: 0 };
    existing.spend += Number(g.spend || 0);
    existing.imp += g.impressions || 0;
    existing.clicks += g.clicks || 0;
    existing.leads += g.leads || 0;
    geoMap.set(r, existing);
  }

  const allLeadsForGeo = await prisma.lead.findMany({
    where: dateFilter ? { createdAt: dateFilter } : undefined,
    select: { contactRef: true, phoneRaw: true, messageText: true }
  });

  const { resolvePhoneState } = await import("@/lib/geoIntelligence");
  const waStateCount = new Map<string, number>();
  for (const l of allLeadsForGeo) {
    const s = resolvePhoneState(l.contactRef) || resolvePhoneState(l.phoneRaw);
    if (s) {
      waStateCount.set(s, (waStateCount.get(s) || 0) + 1);
    }
  }

  const totalGeoSpend = Array.from(geoMap.values()).reduce((sum, g) => sum + g.spend, 0);

  const geoRows = Array.from(geoMap.entries()).map(([region, g]) => {
    const waLeads = waStateCount.get(region) || 0;
    const cpl = g.leads > 0 ? g.spend / g.leads : 0;
    const spendShare = totalGeoSpend > 0 ? (g.spend / totalGeoSpend) * 100 : 0;

    return {
      "State / Territory": region,
      "Country": "India",
      "Total Spend (₹)": Math.round(g.spend),
      "Spend Share (%)": Number(spendShare.toFixed(1)),
      "Impressions": g.imp,
      "Clicks": g.clicks,
      "Ad Inbound Leads": g.leads,
      "WhatsApp CRM Leads": waLeads,
      "Total Combined Leads": g.leads + waLeads,
      "Avg Cost Per Lead (₹)": Math.round(cpl)
    };
  }).sort((a, b) => b["Total Spend (₹)"] - a["Total Spend (₹)"]);

  // 3. Fetch Website Analytics Data
  const webWhere: any = {};
  if (dateFilter) webWhere.createdAt = dateFilter;
  if (brand !== "ALL") webWhere.brand = { contains: brand, mode: "insensitive" };

  const webEvents = await prisma.websiteAnalytics.findMany({
    where: webWhere,
    orderBy: { createdAt: "desc" },
    take: 1000
  });

  const webPagesMap = new Map<string, { views: number; timeSpent: number; exits: number; brand: string; category: string }>();
  const referrerMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();

  for (const w of webEvents) {
    const path = w.pagePath || "/";
    const existing = webPagesMap.get(path) || { views: 0, timeSpent: 0, exits: 0, brand: w.brand || "Halte", category: w.category || "General" };
    existing.views++;
    existing.timeSpent += w.timeSpentSec || 0;
    if (w.isExit) existing.exits++;
    webPagesMap.set(path, existing);

    const ref = w.referrer || "Direct";
    referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1);

    const dev = w.deviceType || "Desktop";
    deviceMap.set(dev, (deviceMap.get(dev) || 0) + 1);
  }

  const webPagesRows = Array.from(webPagesMap.entries()).map(([path, data]) => {
    const avgTime = data.views > 0 ? Math.round(data.timeSpent / data.views) : 0;
    const exitRate = data.views > 0 ? (data.exits / data.views) * 100 : 0;
    return {
      "Page Path": path,
      "Brand": data.brand,
      "Category": data.category,
      "Total Pageviews": data.views,
      "Total Time Spent (sec)": data.timeSpent,
      "Avg Time on Page (sec)": avgTime,
      "Exits": data.exits,
      "Exit Rate (%)": Number(exitRate.toFixed(1))
    };
  }).sort((a, b) => b["Total Pageviews"] - a["Total Pageviews"]);

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

  const { extractLeadMetadata } = await import("@/lib/leadMatcher");

  const leadsRows = leads.map(l => {
    const meta = extractLeadMetadata(l.messageText, l.contactRef);
    const messages = l.messageText ? l.messageText.split("\n---\n") : [];
    const latestMsg = messages.length > 0 ? messages[messages.length - 1] : (l.messageText || "");

    return {
      "Lead ID": l.id,
      "Contact / Name": l.contactRef,
      "Phone Number": l.phoneRaw || meta.phoneRaw || "",
      "Receiving Channel": l.instance || meta.phoneInstance || "WhatsApp Phone 1",
      "Platform Source": l.platform || meta.platform || "WhatsApp Direct",
      "Account / Handle": l.accountName || meta.accountName || "",
      "Brand": l.adSet?.campaign?.brand?.name || meta.brand || "Halte All",
      "Linked Campaign": l.adSet?.campaign?.name || "Direct / Web",
      "Linked Ad Set": l.adSet?.name || "Unassigned",
      "State / Region": meta.state || "National",
      "Messages Received": l.messagesCount || (messages.length > 0 ? messages.length : 1),
      "Tag Status": l.tag,
      "Latest Message": latestMsg,
      "Date": new Date(l.updatedAt || l.createdAt).toLocaleDateString(),
      "Time": new Date(l.updatedAt || l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
  });

  // 5. Executive Overview Summary Rows
  const totalSpend = campaignsRows.reduce((s, c) => s + c["Total Spend (₹)"], 0);
  const totalImp = campaignsRows.reduce((s, c) => s + c["Impressions"], 0);
  const totalClicks = campaignsRows.reduce((s, c) => s + c["Clicks"], 0);
  const totalLeads = leadsRows.length;
  const genuineLeads = leadsRows.filter(l => l["Tag Status"] === "GENUINE" || l["Tag Status"] === "CONVERTED").length;
  const convertedLeads = leadsRows.filter(l => l["Tag Status"] === "CONVERTED").length;
  const spamLeads = leadsRows.filter(l => l["Tag Status"] === "SPAM").length;

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
    { "Metric": "Total Website Recorded Sessions", "Value": webEvents.length.toLocaleString() },
    { "Metric": "Active Geographic Regions", "Value": geoRows.length.toString() },
    { "Metric": "Date Range Filter Applied", "Value": range.toUpperCase().replace("_", " ") },
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
