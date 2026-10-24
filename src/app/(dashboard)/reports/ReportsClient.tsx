"use client";

import { useState } from "react";
import Link from "next/link";

interface Kpis {
  totalCampaigns: number;
  totalAdSets: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalGeoRegions: number;
  totalLeads: number;
  genuineLeadsCount: number;
  webAnalyticsCount: number;
  brands: string[];
}

export default function ReportsClient({
  initialKpis,
  userRole
}: {
  initialKpis: Kpis;
  userRole: string;
}) {
  const [dateRange, setDateRange] = useState<string>("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [downloading, setDownloading] = useState<string | null>(null);

  // Preview State
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleDownload = (type: string, format: "xlsx" | "csv" | "json" = "xlsx") => {
    setDownloading(`${type}_${format}`);
    const params = new URLSearchParams({
      type,
      format,
      range: dateRange,
      brand: selectedBrand
    });

    if (dateRange === "custom" && customStart) params.set("startDate", customStart);
    if (dateRange === "custom" && customEnd) params.set("endDate", customEnd);

    const downloadUrl = `/api/reports/download?${params.toString()}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloading(null);
    }, 1500);
  };

  const handlePreview = async (type: string, title: string) => {
    setPreviewType(type);
    setPreviewTitle(title);
    setPreviewLoading(true);

    try {
      const params = new URLSearchParams({
        type,
        preview: "true",
        range: dateRange,
        brand: selectedBrand
      });
      if (dateRange === "custom" && customStart) params.set("startDate", customStart);
      if (dateRange === "custom" && customEnd) params.set("endDate", customEnd);

      const res = await fetch(`/api/reports/download?${params.toString()}`);
      const json = await res.json();
      if (json.sample) {
        setPreviewData(json.sample);
      } else {
        setPreviewData([]);
      }
    } catch (err) {
      console.error("Preview error:", err);
      alert("Failed to load report preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-stone pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-serif text-[30px] m-0 font-semibold text-ink">Download Reports Hub</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-green text-white">
              Executive &amp; Analytics
            </span>
          </div>
          <p className="m-0 text-[13.5px] text-ink-soft">
            Export every kind of detailed report — Meta &amp; Google Ads performance, website analytics, geographical spend, and CRM WhatsApp/Instagram leads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads"
            className="text-[12px] font-semibold border border-stone px-3.5 py-1.5 text-ink hover:text-green bg-card rounded-sm transition-colors flex items-center gap-1.5"
          >
            <span>💬</span> Go to Lead Tagging
          </Link>
          <div className="text-[12px] font-mono border border-stone px-3 py-1.5 text-stone-dark bg-card rounded-md">
            Role: <span className="font-semibold text-ink">{userRole}</span>
          </div>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card-base p-3.5 bg-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Total Ad Spend</div>
          <div className="font-serif text-[20px] font-bold text-ink mt-0.5">
            ₹{initialKpis.totalSpend.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-ink-soft/80 mt-0.5">{initialKpis.totalCampaigns} Campaigns</div>
        </div>
        <div className="card-base p-3.5 bg-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Impressions</div>
          <div className="font-serif text-[20px] font-bold text-ink mt-0.5">
            {initialKpis.totalImpressions.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-ink-soft/80 mt-0.5">{initialKpis.totalClicks.toLocaleString()} Clicks</div>
        </div>
        <div className="card-base p-3.5 bg-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Inbound Leads</div>
          <div className="font-serif text-[20px] font-bold text-ink mt-0.5">
            {initialKpis.totalLeads.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-emerald-700 font-semibold mt-0.5">
            {initialKpis.genuineLeadsCount} Qualified / Genuine
          </div>
        </div>
        <div className="card-base p-3.5 bg-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Website Events</div>
          <div className="font-serif text-[20px] font-bold text-ink mt-0.5">
            {initialKpis.webAnalyticsCount.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-ink-soft/80 mt-0.5">Traffic &amp; Behavior</div>
        </div>
        <div className="card-base p-3.5 bg-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Active Ad Sets</div>
          <div className="font-serif text-[20px] font-bold text-ink mt-0.5">
            {initialKpis.totalAdSets.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-ink-soft/80 mt-0.5">{initialKpis.totalGeoRegions} Geo States</div>
        </div>
        <div className="card-base p-3.5 bg-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Portfolio Brands</div>
          <div className="font-serif text-[20px] font-bold text-ink mt-0.5">
            {initialKpis.brands.length} Brands
          </div>
          <div className="text-[10.5px] text-ink-soft/80 mt-0.5">Gardena, BKR, Gorilla...</div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="card-base p-4 bg-[#FAF9F5] border-stone space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] font-bold text-ink uppercase tracking-wider mr-1.5 flex items-center gap-1">
              <span>📅</span> Date Range:
            </span>
            {[
              { id: "all", label: "All Time" },
              { id: "this_month", label: "This Month (M-O-M)" },
              { id: "last_month", label: "Last Month" },
              { id: "30d", label: "Last 30 Days" },
              { id: "7d", label: "Last 7 Days" },
              { id: "yesterday", label: "Yesterday" },
              { id: "today", label: "Today" },
              { id: "custom", label: "Custom Range" },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-sm border transition-all ${
                  dateRange === r.id
                    ? "bg-ink text-white border-ink shadow-xs"
                    : "bg-white text-ink-soft border-stone hover:text-ink hover:border-ink/40"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Brand Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11.5px] font-bold text-ink uppercase tracking-wider">
              Brand:
            </span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-[12px] font-semibold border border-stone rounded-sm bg-white px-2.5 py-1 text-ink outline-none cursor-pointer hover:border-stone-dark"
            >
              <option value="ALL">All Brands (Complete Portfolio)</option>
              {initialKpis.brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
              <option value="Halte All">Halte All (Unassigned)</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {dateRange === "custom" && (
          <div className="pt-2 border-t border-stone/50 flex items-center gap-3 text-[12px]">
            <span className="font-semibold text-ink-soft">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border border-stone rounded px-2.5 py-1 text-ink bg-white outline-none"
            />
            <span className="font-semibold text-ink-soft">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-stone rounded px-2.5 py-1 text-ink bg-white outline-none"
            />
          </div>
        )}
      </div>

      {/* Hero 1-Click Master BI Workbook Banner */}
      <div className="card-base p-6 bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-2xl">⚡</span>
            <h2 className="font-serif text-[20px] font-bold text-white m-0">
              Master Business Intelligence Workbook (.xlsx)
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              All-In-One Excel
            </span>
          </div>
          <p className="text-[13px] text-stone m-0 max-w-2xl leading-relaxed">
            Downloads a comprehensive, multi-tab Excel file containing: <strong>Executive Overview</strong>, <strong>All Campaigns</strong>, <strong>Ad Sets Performance</strong>, <strong>State Geo Breakdown</strong>, <strong>Website Analytics</strong>, and <strong>Full CRM Inbound Leads</strong> with conversation history.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleDownload("master", "xlsx")}
            disabled={downloading === "master_xlsx"}
            className="text-[13px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-sm transition-all shadow flex items-center gap-2 cursor-pointer"
          >
            <span>{downloading === "master_xlsx" ? "⏳ Generating..." : "↓ Download Complete Workbook (.xlsx)"}</span>
          </button>
        </div>
      </div>

      {/* Detailed Reports Grid */}
      <div>
        <h3 className="font-serif text-[20px] font-semibold text-ink mb-4">
          Detailed Category Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Campaigns & Ad Sets */}
          <div className="card-base p-5 bg-card flex flex-col justify-between border-stone hover:border-stone-dark/40 transition-colors">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl">📊</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Ads Performance
                </span>
              </div>
              <h4 className="font-serif text-[17px] font-bold text-ink mb-1.5">
                Campaigns &amp; Ad Sets Report
              </h4>
              <p className="text-[12.5px] text-ink-soft leading-relaxed mb-4">
                Detailed breakdown of every ad campaign and ad set across Meta &amp; Google: spend, impressions, clicks, CTR, CPC, leads, genuine leads, and CPL.
              </p>
            </div>
            <div className="pt-3 border-t border-stone space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload("ads_campaigns", "xlsx")}
                  className="flex-1 text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink text-center transition-colors"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleDownload("ads_campaigns", "csv")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleDownload("ads_campaigns", "json")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  JSON
                </button>
              </div>
              <button
                onClick={() => handlePreview("ads_campaigns", "Campaigns Performance Report Preview")}
                className="w-full text-[11px] font-semibold text-green hover:underline py-1 text-center"
              >
                👁 Preview Table Data
              </button>
            </div>
          </div>

          {/* Card 2: Website Analytics */}
          <div className="card-base p-5 bg-card flex flex-col justify-between border-stone hover:border-stone-dark/40 transition-colors">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl">🌐</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  Web Traffic
                </span>
              </div>
              <h4 className="font-serif text-[17px] font-bold text-ink mb-1.5">
                Website Analytics &amp; Pages Report
              </h4>
              <p className="text-[12.5px] text-ink-soft leading-relaxed mb-4">
                Complete website traffic audit: pagepaths, brand/product category views, session duration, scroll depth, exit rates, referrers, and device types.
              </p>
            </div>
            <div className="pt-3 border-t border-stone space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload("web_analytics", "xlsx")}
                  className="flex-1 text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink text-center transition-colors"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleDownload("web_analytics", "csv")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleDownload("web_analytics", "json")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  JSON
                </button>
              </div>
              <button
                onClick={() => handlePreview("web_analytics", "Website Pages Analytics Preview")}
                className="w-full text-[11px] font-semibold text-green hover:underline py-1 text-center"
              >
                👁 Preview Table Data
              </button>
            </div>
          </div>

          {/* Card 3: Geo State Breakdown */}
          <div className="card-base p-5 bg-card flex flex-col justify-between border-stone hover:border-stone-dark/40 transition-colors">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl">📍</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Geo Intelligence
                </span>
              </div>
              <h4 className="font-serif text-[17px] font-bold text-ink mb-1.5">
                State-wise Geo &amp; WhatsApp Report
              </h4>
              <p className="text-[12.5px] text-ink-soft leading-relaxed mb-4">
                Regional advertising and sales intelligence: spend by state, impressions, clicks, WhatsApp CRM leads by telecom circle, spend share %, and average CPL.
              </p>
            </div>
            <div className="pt-3 border-t border-stone space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload("geo_performance", "xlsx")}
                  className="flex-1 text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink text-center transition-colors"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleDownload("geo_performance", "csv")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleDownload("geo_performance", "json")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  JSON
                </button>
              </div>
              <button
                onClick={() => handlePreview("geo_performance", "State-wise Geographical Report Preview")}
                className="w-full text-[11px] font-semibold text-green hover:underline py-1 text-center"
              >
                👁 Preview Table Data
              </button>
            </div>
          </div>

          {/* Card 4: CRM Inbound Leads */}
          <div className="card-base p-5 bg-card flex flex-col justify-between border-stone hover:border-stone-dark/40 transition-colors">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl">👥</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  CRM &amp; WhatsApp
                </span>
              </div>
              <h4 className="font-serif text-[17px] font-bold text-ink mb-1.5">
                Inbound Leads &amp; CRM Quality Report
              </h4>
              <p className="text-[12.5px] text-ink-soft leading-relaxed mb-4">
                Full customer inquiries export: phone number, WhatsApp Phone 1/2 channel, Instagram handle, latest message, brand, ad set, messages count, and tag status.
              </p>
            </div>
            <div className="pt-3 border-t border-stone space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload("leads_crm", "xlsx")}
                  className="flex-1 text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink text-center transition-colors"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleDownload("leads_crm", "csv")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleDownload("leads_crm", "json")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  JSON
                </button>
              </div>
              <button
                onClick={() => handlePreview("leads_crm", "Inbound CRM Leads Report Preview")}
                className="w-full text-[11px] font-semibold text-green hover:underline py-1 text-center"
              >
                👁 Preview Table Data
              </button>
            </div>
          </div>

          {/* Card 5: Ad Sets Tercile Rankings */}
          <div className="card-base p-5 bg-card flex flex-col justify-between border-stone hover:border-stone-dark/40 transition-colors">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl">🎯</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Optimization
                </span>
              </div>
              <h4 className="font-serif text-[17px] font-bold text-ink mb-1.5">
                Ad Sets Detailed &amp; Tercile Rankings
              </h4>
              <p className="text-[12.5px] text-ink-soft leading-relaxed mb-4">
                Granular ad set performance metrics: spend, optimization goal, converted sales, cost per genuine lead (CPGL), and algorithmic scaling recommendations.
              </p>
            </div>
            <div className="pt-3 border-t border-stone space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload("adsets", "xlsx")}
                  className="flex-1 text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink text-center transition-colors"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleDownload("adsets", "csv")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleDownload("adsets", "json")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  JSON
                </button>
              </div>
              <button
                onClick={() => handlePreview("adsets", "Ad Sets Detailed Performance Preview")}
                className="w-full text-[11px] font-semibold text-green hover:underline py-1 text-center"
              >
                👁 Preview Table Data
              </button>
            </div>
          </div>

          {/* Card 6: Executive Overview */}
          <div className="card-base p-5 bg-card flex flex-col justify-between border-stone hover:border-stone-dark/40 transition-colors">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl">📈</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                  Management
                </span>
              </div>
              <h4 className="font-serif text-[17px] font-bold text-ink mb-1.5">
                Executive M-O-M Summary
              </h4>
              <p className="text-[12.5px] text-ink-soft leading-relaxed mb-4">
                High-level business KPIs for leadership: total ad spend, overall CTR, average CPC, total lead count, genuine leads, conversion rate, and cost per sale.
              </p>
            </div>
            <div className="pt-3 border-t border-stone space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload("executive", "xlsx")}
                  className="flex-1 text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink text-center transition-colors"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleDownload("executive", "csv")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleDownload("executive", "json")}
                  className="text-[11.5px] font-semibold py-1.5 px-3 bg-card border border-stone hover:bg-stone/10 rounded-sm text-ink-soft hover:text-ink transition-colors"
                >
                  JSON
                </button>
              </div>
              <button
                onClick={() => handlePreview("executive", "Executive Overview Metrics Preview")}
                className="w-full text-[11px] font-semibold text-green hover:underline py-1 text-center"
              >
                👁 Preview Table Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Table Preview Section */}
      {previewType && (
        <div className="card-base p-6 bg-card border-stone space-y-4">
          <div className="flex justify-between items-center border-b border-stone pb-3">
            <div>
              <h3 className="font-serif text-[18px] font-bold text-ink m-0">{previewTitle}</h3>
              <p className="text-[12px] text-ink-soft m-0">
                Showing sample rows for current date range: <strong>{dateRange}</strong> | Brand: <strong>{selectedBrand}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(previewType, "xlsx")}
                className="text-[12px] font-bold bg-green hover:bg-green/90 text-white px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1"
              >
                <span>↓</span> Export Complete Table (.xlsx)
              </button>
              <button
                onClick={() => setPreviewType(null)}
                className="text-[12px] border border-stone text-ink-soft hover:text-ink px-2.5 py-1.5 rounded-sm"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {previewLoading ? (
            <div className="py-12 text-center text-ink-soft text-[13px]">
              Loading report preview...
            </div>
          ) : previewData.length === 0 ? (
            <div className="py-8 text-center text-ink-soft text-[13px]">
              No data records found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-stone rounded-sm">
              <table className="w-full text-left text-[12px] border-collapse">
                <thead>
                  <tr className="bg-stone/20 text-ink sticky top-0 border-b border-stone">
                    {Object.keys(previewData[0] || {}).map((col) => (
                      <th key={col} className="p-2.5 font-bold uppercase tracking-wider text-[10.5px] whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/40">
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-stone/10 transition-colors">
                      {Object.values(row).map((val: any, cIdx) => (
                        <td key={cIdx} className="p-2.5 whitespace-nowrap text-ink">
                          {typeof val === "number" ? val.toLocaleString() : String(val ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
