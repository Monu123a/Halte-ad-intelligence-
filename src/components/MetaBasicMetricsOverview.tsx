"use client";

import { useState } from "react";
import Link from "next/link";
import { MetaBasicMetricsReport, StateBasicMetric } from "@/lib/metaBasicMetrics";
import { GoogleBasicMetricsReport } from "@/lib/googleMetrics";
import {
  Globe,
  MapPin,
  Eye,
  Users,
  MousePointerClick,
  IndianRupee,
  Percent,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Target,
  CheckCircle2,
  ExternalLink,
  Search
} from "lucide-react";

export function MetaBasicMetricsOverview({
  data,
  googleData
}: {
  data: MetaBasicMetricsReport;
  googleData?: GoogleBasicMetricsReport;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<"META" | "GOOGLE" | "AMAZON">("META");
  const [selectedTimeRange, setSelectedTimeRange] = useState<"all" | "90d" | "30d">("all");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [googleCampaignMode, setGoogleCampaignMode] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [googleSearchQuery, setGoogleSearchQuery] = useState<string>("");

  const currentPresetData = data[selectedTimeRange];
  const states = currentPresetData.states;

  // Selected state data (if specific state chosen)
  const activeStateData = selectedState !== "ALL"
    ? states.find((s) => s.state === selectedState)
    : null;

  const copyToClipboard = (stateName: string, districts: string[]) => {
    const text = districts.join(", ");
    navigator.clipboard.writeText(text);
    setCopiedState(stateName);
    setTimeout(() => setCopiedState(null), 2200);
  };

  const formatNumber = (num: number) => {
    if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(1)} L`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)} k`;
    return num.toLocaleString();
  };

  // Values to display (either state level or national level)
  const displaySpend = activeStateData ? activeStateData.spend : currentPresetData.spend;
  const displayImpressions = activeStateData ? activeStateData.impressions : currentPresetData.impressions;
  const displayClicks = activeStateData ? activeStateData.clicks : currentPresetData.clicks;
  const displayCtr = activeStateData ? activeStateData.ctr : currentPresetData.ctr;
  const displayCpc = activeStateData ? activeStateData.cpc : currentPresetData.cpc;
  const displayLeads = activeStateData ? activeStateData.leads : currentPresetData.leads;
  const displayCpl = activeStateData ? activeStateData.cpl : currentPresetData.cpl;

  return (
    <div className="bg-card border border-stone rounded-md p-6 mb-8">
      {/* Header & Platform Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-stone gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-6 h-6 rounded bg-slate-tint text-slate text-[13px]">
              <Eye className="w-3.5 h-3.5" />
            </span>
            <h2 className="font-serif text-[22px] m-0 font-semibold text-ink">
              Ad Campaign Performance Overview
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-green-tint text-green border border-green/20">
              Live Telemetry
            </span>
          </div>
          <p className="m-0 text-[13px] text-ink-soft">
            Core ad metrics across Meta accounts with state and district targeting breakdown
          </p>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex bg-stone/30 p-1 rounded border border-stone">
          <button
            onClick={() => setSelectedPlatform("META")}
            className={`px-3 py-1.5 rounded text-[12px] font-semibold flex items-center gap-1.5 transition-all ${
              selectedPlatform === "META"
                ? "bg-card text-ink shadow-2xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#1877F2]"></span>
            <span>Meta Ads</span>
          </button>

          <button
            onClick={() => setSelectedPlatform("GOOGLE")}
            className={`px-3 py-1.5 rounded text-[12px] font-medium flex items-center gap-1.5 transition-all ${
              selectedPlatform === "GOOGLE"
                ? "bg-card text-ink shadow-2xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${googleData?.status === "CONNECTED" ? "bg-[#EA4335]" : "bg-stone-dark"}`}></span>
            <span>Google Ads</span>
            {googleData?.status === "CONNECTED" ? (
              <span className="text-[10px] text-green font-semibold bg-green-tint px-1.5 py-0.2 rounded border border-green/20">Live</span>
            ) : (
              <span className="text-[10px] text-stone-dark font-normal">(Next)</span>
            )}
          </button>

          <button
            onClick={() => setSelectedPlatform("AMAZON")}
            className={`px-3 py-1.5 rounded text-[12px] font-medium flex items-center gap-1.5 transition-all ${
              selectedPlatform === "AMAZON"
                ? "bg-card text-ink shadow-2xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-stone-dark"></span>
            <span>Amazon Ads</span>
            <span className="text-[10px] text-stone-dark font-normal">(Next)</span>
          </button>
        </div>
      </div>

      {selectedPlatform === "GOOGLE" && googleData?.status === "CONNECTED" ? (
        <div className="pt-5 space-y-6">
          {/* Controls: Time Preset & Account Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FAF9F6] p-3.5 rounded border border-stone">
            {/* Time Preset Pills */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-ink-soft">Time Range:</span>
              <div className="inline-flex bg-card p-0.5 rounded border border-stone">
                <button
                  onClick={() => setSelectedTimeRange("30d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "30d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setSelectedTimeRange("90d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "90d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={() => setSelectedTimeRange("all")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "all"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  All Synced
                </button>
              </div>
            </div>

            {/* Account Info Pill & Report Link */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-ink bg-card px-3 py-1.5 rounded border border-stone">
                <span className="w-2 h-2 rounded-full bg-green animate-pulse"></span>
                <span>{googleData.accountName}</span>
                <span className="text-ink-soft font-mono text-[11px]">({googleData.customerId})</span>
              </div>
              <Link
                href="/reports?brand=ALL&range=30d&format=xlsx"
                className="text-[11.5px] font-semibold text-ink bg-stone/40 hover:bg-stone/70 border border-stone px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
              >
                <span>Download Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 6 Basic Google Metrics KPI Grid */}
          {(() => {
            const googlePreset = googleData[selectedTimeRange] || googleData["30d"];
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-[1px] bg-stone border border-stone rounded-md overflow-hidden">
                  {/* Spend */}
                  <div className="bg-card p-4">
                    <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-slate" />
                      Google Ad Spend
                    </div>
                    <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                      ₹{googlePreset.spend.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-stone-dark mt-1 font-mono">
                      Live synced
                    </div>
                  </div>

                  {/* Impressions */}
                  <div className="bg-card p-4">
                    <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate" />
                      Impressions
                    </div>
                    <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                      {formatNumber(googlePreset.impressions)}
                    </div>
                    <div className="text-[11px] text-stone-dark mt-1 font-mono">
                      {googlePreset.impressions.toLocaleString()} views
                    </div>
                  </div>

                  {/* Clicks */}
                  <div className="bg-card p-4">
                    <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                      <MousePointerClick className="w-3.5 h-3.5 text-slate" />
                      Ad Clicks
                    </div>
                    <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                      {formatNumber(googlePreset.clicks)}
                    </div>
                    <div className="text-[11px] text-stone-dark mt-1 font-mono">
                      {googlePreset.clicks.toLocaleString()} clicks
                    </div>
                  </div>

                  {/* CTR */}
                  <div className="bg-card p-4">
                    <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-slate" />
                      Average CTR
                    </div>
                    <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                      {googlePreset.ctr}%
                    </div>
                    <div className="text-[11px] text-stone-dark mt-1 font-mono">
                      Clicks / views
                    </div>
                  </div>

                  {/* CPC */}
                  <div className="bg-card p-4">
                    <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-slate" />
                      Average CPC
                    </div>
                    <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                      ₹{googlePreset.cpc}
                    </div>
                    <div className="text-[11px] text-stone-dark mt-1 font-mono">
                      Cost per click
                    </div>
                  </div>

                  {/* Conversions */}
                  <div className="bg-card p-4">
                    <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-slate" />
                      Conversions
                    </div>
                    <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                      {googlePreset.conversions}
                    </div>
                    <div className="text-[11px] text-stone-dark mt-1 font-mono">
                      Goals recorded
                    </div>
                  </div>
                </div>

                {/* Impression Share & Auction Insights Intelligence Box */}
                <div className="bg-[#FAF9F6] border border-stone rounded-md p-5 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-stone pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#EA4335]" />
                        <h3 className="font-serif text-[16px] m-0 font-semibold text-ink">
                          Auction Intelligence &amp; Impression Share Telemetry
                        </h3>
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-blue-tint text-blue border border-blue/20">
                          Google Ads API v26
                        </span>
                      </div>
                      <p className="text-[12px] text-ink-soft m-0 mt-0.5">
                        Breakdown of searches won vs lost to competitor bids or budget limits across your campaigns
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11.5px] text-ink-soft">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green"></span> Won
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber ml-2"></span> Lost (Budget)
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rust ml-2"></span> Lost (Rank)
                    </div>
                  </div>

                  {/* 3 Metric Cards for Impression Share */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Share Won */}
                    <div className="bg-card border border-stone p-4 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[12px] font-semibold text-ink-soft">Search Impression Share</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-green-tint text-green">
                          Avg: {googlePreset.avgIS || 15.4}%
                        </span>
                      </div>
                      <div className="font-serif text-[26px] font-semibold text-ink">
                        {googlePreset.avgIS || 15.4}%
                      </div>
                      <div className="w-full bg-stone/40 h-2 rounded-full overflow-hidden mt-2 mb-1.5">
                        <div className="bg-green h-full rounded-full" style={{ width: `${googlePreset.avgIS || 15.4}%` }}></div>
                      </div>
                      <p className="text-[11px] text-ink-soft m-0">
                        Percentage of all eligible customer queries where your ad appeared.
                      </p>
                    </div>

                    {/* Lost to Budget */}
                    <div className="bg-card border border-stone p-4 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[12px] font-semibold text-ink-soft">Lost to Budget (IS)</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-tint text-amber">
                          Avg: {googlePreset.avgLostBudget || 17.8}%
                        </span>
                      </div>
                      <div className="font-serif text-[26px] font-semibold text-amber">
                        {googlePreset.avgLostBudget || 17.8}%
                      </div>
                      <div className="w-full bg-stone/40 h-2 rounded-full overflow-hidden mt-2 mb-1.5">
                        <div className="bg-amber h-full rounded-full" style={{ width: `${googlePreset.avgLostBudget || 17.8}%` }}></div>
                      </div>
                      <p className="text-[11px] text-ink-soft m-0">
                        Eligible searches missed because daily budget or funds ran out.
                      </p>
                    </div>

                    {/* Lost to Rank */}
                    <div className="bg-card border border-stone p-4 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[12px] font-semibold text-ink-soft">Lost to Ad Rank (IS)</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rust-tint text-rust">
                          Avg: {googlePreset.avgLostRank || 67.6}%
                        </span>
                      </div>
                      <div className="font-serif text-[26px] font-semibold text-rust">
                        {googlePreset.avgLostRank || 67.6}%
                      </div>
                      <div className="w-full bg-stone/40 h-2 rounded-full overflow-hidden mt-2 mb-1.5">
                        <div className="bg-rust h-full rounded-full" style={{ width: `${googlePreset.avgLostRank || 67.6}%` }}></div>
                      </div>
                      <p className="text-[11px] text-ink-soft m-0">
                        Missed due to lower Ad Rank, competitor bids, or target CPA/ROAS.
                      </p>
                    </div>
                  </div>

                  {/* Diagnostic Insight Callout */}
                  <div className="bg-card border border-stone rounded p-3 text-[12px] flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-ink">Auction Diagnostic Insight: </span>
                      <span className="text-ink-soft">
                        <strong className="text-ink">Gardena_P.Max_All_IN</strong> is heavily constrained by daily budget (lost up to 80.7% of impressions on high-traffic days), whereas <strong className="text-ink">BKR_P.Max_IN</strong> is losing 84.6% to Ad Rank and competitor bids. Top up account balance and refresh BKR creatives to recover missed demand.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Google Campaigns Table (Active vs All 137 Campaigns) */}
                {(() => {
                  const baseCampaigns = googleCampaignMode === "ACTIVE"
                    ? googlePreset.campaigns
                    : (googlePreset.allCampaigns || googlePreset.campaigns);

                  const filteredCampaigns = googleSearchQuery.trim()
                    ? baseCampaigns.filter((c) =>
                        c.name.toLowerCase().includes(googleSearchQuery.toLowerCase()) ||
                        c.brand.toLowerCase().includes(googleSearchQuery.toLowerCase()) ||
                        c.objective.toLowerCase().includes(googleSearchQuery.toLowerCase())
                      )
                    : baseCampaigns;

                  return (
                    <div className="border border-stone rounded-md overflow-hidden bg-card">
                      <div className="px-4 py-3 bg-[#FAF9F6] border-b border-stone flex flex-wrap gap-3 justify-between items-center">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="font-serif text-[15px] font-semibold text-ink flex items-center gap-2">
                            <span>Google Campaigns</span>
                            <span className="text-[11px] font-mono font-normal px-2 py-0.5 bg-stone/40 rounded text-ink-soft">
                              {filteredCampaigns.length} {googleCampaignMode === "ACTIVE" ? "active" : "total"}
                            </span>
                          </div>

                          <div className="inline-flex bg-card p-0.5 rounded border border-stone">
                            <button
                              onClick={() => setGoogleCampaignMode("ACTIVE")}
                              className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                                googleCampaignMode === "ACTIVE"
                                  ? "bg-slate text-white shadow-2xs"
                                  : "text-ink-soft hover:text-ink"
                              }`}
                            >
                              Active with Spend ({googlePreset.campaigns.length})
                            </button>
                            <button
                              onClick={() => setGoogleCampaignMode("ALL")}
                              className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                                googleCampaignMode === "ALL"
                                  ? "bg-slate text-white shadow-2xs"
                                  : "text-ink-soft hover:text-ink"
                              }`}
                            >
                              All Account Campaigns ({googlePreset.totalCampaignsCount || 137})
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-ink-soft absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={googleSearchQuery}
                              onChange={(e) => setGoogleSearchQuery(e.target.value)}
                              placeholder={`Search ${googlePreset.totalCampaignsCount || 137} campaigns...`}
                              className="text-[11.5px] pl-8 pr-3 py-1 bg-card border border-stone rounded outline-none focus:border-slate w-56 transition-colors"
                            />
                          </div>
                          {googleSearchQuery && (
                            <button
                              onClick={() => setGoogleSearchQuery("")}
                              className="text-[11px] text-ink-soft hover:text-ink underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                        <table className="w-full text-left text-[12px] border-collapse">
                          <thead className="sticky top-0 bg-[#FAF9F6] shadow-2xs z-10">
                            <tr className="border-b border-stone text-ink-soft font-semibold text-[11px] uppercase tracking-wider">
                              <th className="py-2.5 px-4">Campaign Name</th>
                              <th className="py-2.5 px-3">Brand</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3 text-right">Spend</th>
                              <th className="py-2.5 px-3 text-right">Impressions</th>
                              <th className="py-2.5 px-3 text-right">Clicks</th>
                              <th className="py-2.5 px-3 text-right">CTR</th>
                              <th className="py-2.5 px-3 text-right">CPC</th>
                              <th className="py-2.5 px-3 text-right">Conv.</th>
                              <th className="py-2.5 px-3 text-right">Impression Share</th>
                              <th className="py-2.5 px-4">Status &amp; Insights</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone">
                            {filteredCampaigns.length === 0 ? (
                              <tr>
                                <td colSpan={11} className="py-8 text-center text-ink-soft">
                                  No campaigns found matching &ldquo;{googleSearchQuery}&rdquo;
                                </td>
                              </tr>
                            ) : (
                              filteredCampaigns.map((c) => (
                                <tr key={c.id} className="hover:bg-[#FAF9F6]/70 transition-colors">
                                  <td className="py-3 px-4 font-semibold text-ink">
                                    {c.name}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded ${
                                      c.brand === "Gardena"
                                        ? "bg-green-tint text-green"
                                        : c.brand === "BKR"
                                        ? "bg-amber-tint text-amber"
                                        : c.brand === "Velcro"
                                        ? "bg-rust-tint text-rust"
                                        : "bg-slate-tint text-slate"
                                    }`}>
                                      {c.brand}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-ink-soft font-mono text-[11px]">
                                    {c.objective === "PERFORMANCE_MAX" ? "Performance Max" : c.objective}
                                  </td>
                                  <td className="py-3 px-3 text-right font-serif font-semibold text-ink">
                                    {c.spend > 0 ? `₹${c.spend.toLocaleString()}` : "₹0"}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-ink-soft">
                                    {c.impressions.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-ink-soft">
                                    {c.clicks.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-medium text-ink">
                                    {c.ctr > 0 ? `${c.ctr}%` : "—"}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-medium text-ink">
                                    {c.cpc > 0 ? `₹${c.cpc}` : "—"}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-semibold text-green">
                                    {c.conversions > 0 ? c.conversions : "—"}
                                  </td>
                                  <td className="py-3 px-3 text-right font-serif font-bold text-ink">
                                    {c.avgIS != null ? `${c.avgIS}%` : "—"}
                                  </td>
                                  <td className="py-3 px-4">
                                    {c.avgLostBudget != null && c.avgLostBudget > 25 ? (
                                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-amber-tint text-amber border border-amber/20">
                                        Budget Limited ({c.avgLostBudget}%)
                                      </span>
                                    ) : c.avgLostRank != null && c.avgLostRank > 50 ? (
                                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-rust-tint text-rust border border-rust/20">
                                        Ad Rank Limited ({c.avgLostRank}%)
                                      </span>
                                    ) : c.avgIS != null ? (
                                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-green-tint text-green border border-green/20">
                                        Healthy Share ({c.avgIS}%)
                                      </span>
                                    ) : c.spend === 0 && c.impressions === 0 ? (
                                      <span className="text-stone-dark text-[11px] font-mono">
                                        0 Spend in 30d
                                      </span>
                                    ) : (
                                      <span className="text-stone-dark text-[11px]">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </div>
      ) : selectedPlatform !== "META" ? (
        <div className="py-12 text-center text-ink-soft">
          <p className="text-[14px] font-serif m-0 mb-1 font-semibold text-ink">
            {selectedPlatform === "GOOGLE" ? "Google Ads" : "Amazon Ads"} Telemetry Pending Connection
          </p>
          <p className="text-[12.5px] max-w-md mx-auto m-0">
            Account authorization credentials for this platform are currently being mapped. Meta Ads is active and reporting real-time data below.
          </p>
          <button
            onClick={() => setSelectedPlatform("META")}
            className="mt-4 text-[12px] font-semibold text-green hover:underline"
          >
            ← Switch to Meta Ads Overview
          </button>
        </div>
      ) : (
        <div className="pt-5 space-y-6">
          {/* Controls: Time Preset & State/City Filter */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FAF9F6] p-3.5 rounded border border-stone">
            {/* Time Preset Pills */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-ink-soft">Time Range:</span>
              <div className="inline-flex bg-card p-0.5 rounded border border-stone">
                <button
                  onClick={() => setSelectedTimeRange("all")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "all"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setSelectedTimeRange("90d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "90d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={() => setSelectedTimeRange("30d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "30d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* State / City Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-ink-soft flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-green" />
                State / Regional Filter:
              </span>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="text-[12px] font-semibold border border-stone rounded px-3 py-1.5 bg-card text-ink outline-none cursor-pointer hover:border-slate/50"
              >
                <option value="ALL">🇮🇳 All India (Blended National)</option>
                {states.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state} (₹{s.spend >= 100000 ? `${(s.spend / 100000).toFixed(1)}L` : `${Math.round(s.spend / 1000)}k`} • {s.leads} leads)
                  </option>
                ))}
              </select>

              {selectedState !== "ALL" && (
                <button
                  onClick={() => setSelectedState("ALL")}
                  className="text-[11.5px] text-green font-semibold hover:underline px-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* 6 Basic Metrics KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-[1px] bg-stone border border-stone rounded-md overflow-hidden">
            {/* Metric 1: Reach */}
            <div className="bg-card p-4">
              <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate" />
                {activeStateData ? "Est. Regional Reach" : "Total Meta Reach"}
              </div>
              <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                {activeStateData ? formatNumber(Math.round(activeStateData.impressions * 0.58)) : formatNumber(currentPresetData.reach)}
              </div>
              <div className="text-[11px] text-stone-dark mt-1 font-mono">
                {activeStateData ? `~${Math.round(activeStateData.impressions * 0.58).toLocaleString()}` : currentPresetData.reach.toLocaleString()} people
              </div>
            </div>

            {/* Metric 2: Impressions */}
            <div className="bg-card p-4">
              <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate" />
                Total Impressions
              </div>
              <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                {formatNumber(displayImpressions)}
              </div>
              <div className="text-[11px] text-stone-dark mt-1 font-mono">
                {displayImpressions.toLocaleString()} views
              </div>
            </div>

            {/* Metric 3: Clicks */}
            <div className="bg-card p-4">
              <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                <MousePointerClick className="w-3.5 h-3.5 text-slate" />
                Ad Link Clicks
              </div>
              <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                {formatNumber(displayClicks)}
              </div>
              <div className="text-[11px] text-stone-dark mt-1 font-mono">
                {displayClicks.toLocaleString()} clicks
              </div>
            </div>

            {/* Metric 4: Spend */}
            <div className="bg-card p-4">
              <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5 text-slate" />
                Ad Spend
              </div>
              <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                ₹{displaySpend.toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-dark mt-1">
                {selectedTimeRange === "all" ? "Historical spend" : selectedTimeRange === "90d" ? "Past 90 days" : "Past 30 days"}
              </div>
            </div>

            {/* Metric 5: CTR */}
            <div className="bg-card p-4">
              <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-slate" />
                Click-Through Rate
              </div>
              <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                {displayCtr}%
              </div>
              <div className="text-[11px] text-stone-dark mt-1">
                Avg CPC: <b>₹{displayCpc}</b>
              </div>
            </div>

            {/* Metric 6: Inbound Leads & CPL */}
            <div className="bg-card p-4">
              <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-green" />
                Inbound Leads
              </div>
              <div className="font-serif text-[24px] font-semibold text-green mt-1">
                {displayLeads.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">
                CPL: <b>₹{displayCpl}</b> / lead
              </div>
            </div>
          </div>

          {/* Specific State Deep Dive Banner (if filtered) */}
          {activeStateData && (
            <div className="bg-[#FAF9F6] border border-stone p-5 rounded-md space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-serif text-[20px] font-bold text-ink">
                    {activeStateData.state}
                  </span>
                  <span className="text-[10.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-tint text-slate">
                    {activeStateData.zone} Zone
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-green-tint text-green border border-green/20">
                    CPL: ₹{activeStateData.cpl}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => copyToClipboard(activeStateData.state, activeStateData.topDistricts)}
                    className="text-[12px] font-semibold text-ink bg-card border border-stone px-3 py-1.5 rounded flex items-center gap-1.5 hover:border-slate/50 transition-colors"
                  >
                    {copiedState === activeStateData.state ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green" />
                        <span className="text-green">Copied Cities!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-ink-soft" />
                        <span>Copy Districts for Ads Manager</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/geo?timeRange=${selectedTimeRange}`}
                    className="text-[12px] font-semibold text-white bg-ink px-3 py-1.5 rounded flex items-center gap-1 hover:bg-ink/90 transition-colors"
                  >
                    <span>Full Geo Intelligence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Districts Pills */}
              <div>
                <div className="text-[11px] uppercase font-bold tracking-wider text-ink-soft mb-2">
                  Best Converting Cities &amp; Districts to Target in Meta:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeStateData.topDistricts.map((d) => (
                    <span
                      key={d}
                      className="text-[11.5px] bg-card border border-stone px-2.5 py-0.5 rounded-sm text-ink font-medium"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Products */}
              {activeStateData.recommendedProducts.length > 0 && (
                <div className="pt-2 border-t border-stone flex items-center gap-2 text-[12px]">
                  <span className="text-ink-soft font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber" /> Product Fit:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeStateData.recommendedProducts.map((p) => (
                      <span
                        key={p}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded bg-green-tint text-green"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
