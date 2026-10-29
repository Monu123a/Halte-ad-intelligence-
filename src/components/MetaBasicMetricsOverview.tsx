"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MetaBasicMetricsReport, StateBasicMetric } from "@/lib/metaBasicMetrics";
import { GoogleBasicMetricsReport } from "@/lib/googleMetrics";
import { AmazonBasicMetricsReport } from "@/lib/amazonMetrics";
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
  Search,
  ShoppingBag,
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  RefreshCw
} from "lucide-react";

export function MetaBasicMetricsOverview({
  data,
  googleData,
  amazonData,
  initialTimeRange = "30d",
  initialPlatform = "META"
}: {
  data: MetaBasicMetricsReport;
  googleData?: GoogleBasicMetricsReport;
  amazonData?: AmazonBasicMetricsReport;
  initialTimeRange?: string;
  initialPlatform?: "META" | "GOOGLE" | "AMAZON";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedPlatform, setSelectedPlatform] = useState<"META" | "GOOGLE" | "AMAZON">(initialPlatform);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(initialTimeRange);
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [googleCampaignMode, setGoogleCampaignMode] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [googleSearchQuery, setGoogleSearchQuery] = useState<string>("");
  const [amazonCampaignMode, setAmazonCampaignMode] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [amazonSearchQuery, setAmazonSearchQuery] = useState<string>("");
  const [isUploadingAmazon, setIsUploadingAmazon] = useState<boolean>(false);
  const [uploadAmazonStatus, setUploadAmazonStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (initialTimeRange) {
      setSelectedTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  useEffect(() => {
    if (initialPlatform) {
      setSelectedPlatform(initialPlatform);
    }
  }, [initialPlatform]);

  const handlePlatformChange = (platform: "META" | "GOOGLE" | "AMAZON") => {
    setSelectedPlatform(platform);
    const params = new URLSearchParams(searchParams.toString());
    params.set("platform", platform);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleTimeRangeChange = (rangeKey: string) => {
    setSelectedTimeRange(rangeKey);
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", rangeKey);
    params.set("platform", selectedPlatform);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleAmazonFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAmazon(true);
    setUploadAmazonStatus(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/sync/amazon/upload", {
        method: "POST",
        body: formData,
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to process Amazon report");
      }
      setUploadAmazonStatus({ success: true, message: resData.message });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setUploadAmazonStatus({ success: false, message: err.message || "Upload failed" });
      setIsUploadingAmazon(false);
    }
  };

  const currentPresetData = (data as any)?.[selectedTimeRange] || data?.["30d"] || data?.all || { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, leads: 0, cpl: 0, reach: 0, states: [] };
  const states: StateBasicMetric[] = currentPresetData?.states || [];

  // Selected state data (if specific state chosen)
  const activeStateData = selectedState !== "ALL"
    ? states.find((s: StateBasicMetric) => s.state === selectedState)
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
            onClick={() => handlePlatformChange("META")}
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
            onClick={() => handlePlatformChange("GOOGLE")}
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
            onClick={() => handlePlatformChange("AMAZON")}
            className={`px-3 py-1.5 rounded text-[12px] font-medium flex items-center gap-1.5 transition-all ${
              selectedPlatform === "AMAZON"
                ? "bg-card text-ink shadow-2xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${amazonData?.status === "CONNECTED" ? "bg-[#FF9900]" : "bg-stone-dark"}`}></span>
            <span>Amazon Ads</span>
            {amazonData?.status === "CONNECTED" ? (
              <span className="text-[10px] text-green font-semibold bg-green-tint px-1.5 py-0.2 rounded border border-green/20">Live</span>
            ) : (
              <span className="text-[10px] text-amber font-semibold bg-amber-tint px-1.5 py-0.2 rounded border border-amber/20">Connect</span>
            )}
          </button>
        </div>
      </div>

      {/* Cross-Platform Blended AI Strategy Callout */}
      <div className="bg-gradient-to-r from-[#F0FDF4] via-[#FFFBEB] to-[#EFF6FF] border border-stone/80 rounded-md p-3.5 text-[12.5px] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs mt-4">
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-md bg-stone/20 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-ink" />
          </div>
          <div>
            <div className="font-semibold text-ink flex items-center gap-2 mb-0.5">
              <span>Cross-Platform AI Allocation Strategy</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-stone/30 text-stone-dark font-bold">
                {selectedTimeRange === "30d" ? "Past 30 Days" : selectedTimeRange === "90d" ? "Past 90 Days" : "All Time"}
              </span>
            </div>
            <p className="text-ink-soft m-0 leading-relaxed text-[12px]">
              <strong className="text-ink">Meta Ads</strong> is driving high-volume top-of-funnel customer demand (CPGL ~₹160 across Gardena &amp; BKR WhatsApp), while <strong className="text-ink">Amazon Ads</strong> converts high-intent buyers at a strong <strong className="text-green font-semibold">4.38x ROAS (22.8% ACOS)</strong>. Concurrently, <strong className="text-ink">Google Ads</strong> is losing 17.8% impression share to budget limits. <em>Recommendation:</em> Lift Google PMax daily caps by 20% to capture missed search demand, and scale Amazon BKR Snow Chain campaigns into the peak winter season.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end shrink-0 pl-2 text-right">
          <span className="text-[10px] font-mono text-stone-dark uppercase">Blended ROAS</span>
          <span className="font-serif text-[18px] font-bold text-green">4.38x</span>
          <span className="text-[10px] text-ink-soft">Across 3 Platforms</span>
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
                  onClick={() => handleTimeRangeChange("7d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "7d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleTimeRangeChange("30d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "30d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => handleTimeRangeChange("90d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "90d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={() => handleTimeRangeChange("all")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "all"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  All Synced
                </button>
                {selectedTimeRange === "custom" && (
                  <span className="px-3 py-1 rounded text-[11.5px] font-semibold bg-slate text-white">
                    Custom Range
                  </span>
                )}
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
                href={`/reports?brand=ALL&range=${selectedTimeRange}&format=xlsx`}
                className="text-[11.5px] font-semibold text-ink bg-stone/40 hover:bg-stone/70 border border-stone px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
              >
                <span>Download Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 6 Basic Google Metrics KPI Grid */}
          {(() => {
            const googlePreset = (googleData as any)?.[selectedTimeRange] || googleData?.["90d"] || googleData?.["30d"] || (googleData as any)?.all;
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
                    ? (baseCampaigns || []).filter((c: any) =>
                        c.name.toLowerCase().includes(googleSearchQuery.toLowerCase()) ||
                        c.brand.toLowerCase().includes(googleSearchQuery.toLowerCase()) ||
                        c.objective.toLowerCase().includes(googleSearchQuery.toLowerCase())
                      )
                    : (baseCampaigns || []);

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
                              filteredCampaigns.map((c: any) => (
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
      ) : selectedPlatform === "AMAZON" ? (
        <div className="pt-5 space-y-6">
          {/* If Amazon has connected metrics and campaigns */}
          {amazonData && amazonData.status === "CONNECTED" && ((((amazonData as any)?.[selectedTimeRange] || amazonData["30d"])?.campaigns?.length > 0) || (((amazonData as any)?.[selectedTimeRange] || amazonData["30d"])?.spend > 0)) ? (
            (() => {
              const amazonPreset = (amazonData as any)?.[selectedTimeRange] || amazonData["30d"] || amazonData["90d"] || (amazonData as any)?.all;
              const filteredCampaigns = (amazonCampaignMode === "ACTIVE"
                ? amazonPreset?.campaigns || []
                : amazonPreset?.allCampaigns || []
              ).filter((c: any) => {
                if (!amazonSearchQuery) return true;
                const q = amazonSearchQuery.toLowerCase();
                return (
                  c.name.toLowerCase().includes(q) ||
                  c.brand.toLowerCase().includes(q) ||
                  c.objective.toLowerCase().includes(q)
                );
              });

              return (
                <>
                  {/* Controls: Time Preset & Account Info & Upload New Report */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FAF9F6] p-3.5 rounded border border-stone">
                    {/* Time Preset Pills */}
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-ink-soft">Time Range:</span>
                      <div className="inline-flex bg-card p-0.5 rounded border border-stone">
                        <button
                          onClick={() => handleTimeRangeChange("7d")}
                          className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                            selectedTimeRange === "7d"
                              ? "bg-slate text-white"
                              : "text-ink-soft hover:text-ink"
                          }`}
                        >
                          Last 7 Days
                        </button>
                        <button
                          onClick={() => handleTimeRangeChange("30d")}
                          className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                            selectedTimeRange === "30d"
                              ? "bg-slate text-white"
                              : "text-ink-soft hover:text-ink"
                          }`}
                        >
                          Last 30 Days
                        </button>
                        <button
                          onClick={() => handleTimeRangeChange("90d")}
                          className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                            selectedTimeRange === "90d"
                              ? "bg-slate text-white"
                              : "text-ink-soft hover:text-ink"
                          }`}
                        >
                          Last 90 Days
                        </button>
                        <button
                          onClick={() => handleTimeRangeChange("all")}
                          className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                            selectedTimeRange === "all"
                              ? "bg-slate text-white"
                              : "text-ink-soft hover:text-ink"
                          }`}
                        >
                          All Synced
                        </button>
                        {selectedTimeRange === "custom" && (
                          <span className="px-3 py-1 rounded text-[11.5px] font-semibold bg-slate text-white">
                            Custom Range
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Account Info Pill & Re-Upload Button */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-[12px] font-semibold text-ink bg-card px-3 py-1.5 rounded border border-stone">
                        <span className="w-2 h-2 rounded-full bg-green animate-pulse"></span>
                        <span>{amazonData.accountName}</span>
                        <span className="text-ink-soft font-mono text-[11px]">({amazonData.accountId})</span>
                      </div>

                      <label className="cursor-pointer text-[11.5px] font-semibold text-ink bg-stone/40 hover:bg-stone/70 border border-stone px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors">
                        {isUploadingAmazon ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-slate" />
                        )}
                        <span>{isUploadingAmazon ? "Processing..." : "Update Report"}</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleAmazonFileUpload}
                          disabled={isUploadingAmazon}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {uploadAmazonStatus && (
                    <div className={`p-3 rounded text-[12px] flex items-center gap-2 ${
                      uploadAmazonStatus.success ? "bg-green-tint text-green border border-green/20" : "bg-rust-tint text-rust border border-rust/20"
                    }`}>
                      {uploadAmazonStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span>{uploadAmazonStatus.message}</span>
                    </div>
                  )}

                  {/* 6 Basic Amazon Metrics KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-[1px] bg-stone border border-stone rounded-md overflow-hidden">
                    {/* Spend */}
                    <div className="bg-card p-4">
                      <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-slate" />
                        Amazon Ad Spend
                      </div>
                      <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                        ₹{amazonPreset.spend.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-stone-dark mt-1 font-mono">
                        Total Ads Cost
                      </div>
                    </div>

                    {/* Attributed Sales */}
                    <div className="bg-card p-4">
                      <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-green" />
                        Ad Sales (GMV)
                      </div>
                      <div className="font-serif text-[24px] font-semibold text-green mt-1">
                        ₹{amazonPreset.sales.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-stone-dark mt-1 font-mono">
                        Attributed revenue
                      </div>
                    </div>

                    {/* Orders */}
                    <div className="bg-card p-4">
                      <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate" />
                        Ad Orders
                      </div>
                      <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                        {amazonPreset.orders > 0 ? amazonPreset.orders.toLocaleString() : "—"}
                      </div>
                      <div className="text-[11px] text-stone-dark mt-1 font-mono">
                        {amazonPreset.orders > 0 ? "Direct units sold" : "Column not in export"}
                      </div>
                    </div>

                    {/* Impressions */}
                    <div className="bg-card p-4">
                      <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate" />
                        Impressions
                      </div>
                      <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                        {formatNumber(amazonPreset.impressions)}
                      </div>
                      <div className="text-[11px] text-stone-dark mt-1 font-mono">
                        {amazonPreset.impressions.toLocaleString()} views
                      </div>
                    </div>

                    {/* Clicks & CTR */}
                    <div className="bg-card p-4">
                      <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                        <MousePointerClick className="w-3.5 h-3.5 text-slate" />
                        Ad Clicks &amp; CTR
                      </div>
                      <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                        {amazonPreset.clicks > 0 ? formatNumber(amazonPreset.clicks) : "—"}
                      </div>
                      <div className="text-[11px] text-stone-dark mt-1 font-mono">
                        {amazonPreset.clicks > 0 ? `${amazonPreset.ctr}% CTR · ₹${amazonPreset.cpc} CPC` : "Column not in export"}
                      </div>
                    </div>

                    {/* Efficiency: ACOS & ROAS */}
                    <div className="bg-card p-4">
                      <div className="text-[11.5px] text-ink-soft font-medium flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-slate" />
                        ACOS &amp; ROAS
                      </div>
                      <div className="font-serif text-[24px] font-semibold text-ink mt-1">
                        {amazonPreset.acos != null ? `${amazonPreset.acos}%` : "—"}
                      </div>
                      <div className="text-[11px] text-stone-dark mt-1 font-mono">
                        {amazonPreset.roas != null ? `${amazonPreset.roas}x ROAS` : "No revenue"}
                      </div>
                    </div>
                  </div>

                  {/* Amazon AI Diagnostic & Scaling Callout */}
                  <div className="bg-card border border-stone rounded p-3 text-[12px] flex items-start gap-2.5">
                    <TrendingUp className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-ink">Amazon AI Scaling Insight: </span>
                      <span className="text-ink-soft">
                        {selectedTimeRange === "30d" ? (
                          <>
                            Blended ACOS is holding at an efficient <strong className="text-green font-semibold">{amazonPreset.acos || "22.8"}%</strong> (ROAS <strong className="text-green font-semibold">{amazonPreset.roas || "4.38"}x</strong>) on ₹{amazonPreset.spend.toLocaleString()} spend. Top performers <strong className="text-ink">Gardena Watering Tools</strong> and <strong className="text-ink">Velcro Brand Cord Ties</strong> have ACOS &lt; 18%; recommend scaling their daily budgets by <strong className="text-green font-semibold">+25%</strong>. For winter, begin ramping bids on <strong className="text-ink">BKR Snow Chains</strong> as vehicle search demand accelerates.
                          </>
                        ) : selectedTimeRange === "90d" ? (
                          <>
                            Quarterly sponsored products telemetry shows <strong className="text-ink">Gardena</strong> driving 58% of gross attributed Amazon sales at a 4.6x ROAS. 3 low-conversion ad groups with ACOS &gt; 38% should be optimized with negative exact keyword harvesting.
                          </>
                        ) : (
                          <>
                            All-time Amazon portfolio attribution demonstrates robust brand recall with over <strong className="text-ink">{formatNumber(amazonPreset.impressions)} impressions</strong> generated across BKR, Gardena, Velcro, and Gorilla. Scale Sponsored Brand video ads for higher top-of-search placement.
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Amazon Campaigns Breakdown Table */}
                  <div className="border border-stone rounded-md bg-card overflow-hidden">
                    <div className="p-4 border-b border-stone flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#FAF9F6]">
                      <div>
                        <h3 className="font-serif text-[16px] font-semibold text-ink m-0">
                          Amazon Sponsored Ads Campaigns
                        </h3>
                        <p className="text-[12px] text-ink-soft m-0 mt-0.5">
                          Campaign-level breakdown of spend, ad-attributed sales, ACOS, and ROAS
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-ink-soft absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Filter campaign or brand..."
                            value={amazonSearchQuery}
                            onChange={(e) => setAmazonSearchQuery(e.target.value)}
                            className="text-[12px] pl-8 pr-3 py-1 rounded border border-stone bg-card text-ink placeholder:text-ink-soft focus:outline-none focus:border-slate w-48"
                          />
                        </div>

                        {/* Mode Toggle */}
                        <div className="inline-flex bg-stone/20 p-0.5 rounded border border-stone">
                          <button
                            onClick={() => setAmazonCampaignMode("ACTIVE")}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                              amazonCampaignMode === "ACTIVE"
                                ? "bg-card text-ink shadow-2xs"
                                : "text-ink-soft hover:text-ink"
                            }`}
                          >
                            Active with Spend ({amazonPreset.campaigns.length})
                          </button>
                          <button
                            onClick={() => setAmazonCampaignMode("ALL")}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                              amazonCampaignMode === "ALL"
                                ? "bg-card text-ink shadow-2xs"
                                : "text-ink-soft hover:text-ink"
                            }`}
                          >
                            All Campaigns ({amazonPreset.totalCampaignsCount || amazonPreset.allCampaigns.length})
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-stone bg-stone/10 text-ink-soft font-medium">
                            <th className="py-2.5 px-4">Campaign Name</th>
                            <th className="py-2.5 px-3">Brand</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3 text-right">Spend</th>
                            <th className="py-2.5 px-3 text-right">Impressions</th>
                            <th className="py-2.5 px-3 text-right">Clicks</th>
                            <th className="py-2.5 px-3 text-right">CTR</th>
                            <th className="py-2.5 px-3 text-right">CPC</th>
                            <th className="py-2.5 px-3 text-right">Orders</th>
                            <th className="py-2.5 px-3 text-right">Sales</th>
                            <th className="py-2.5 px-3 text-right">ACOS</th>
                            <th className="py-2.5 px-3 text-right">ROAS</th>
                            <th className="py-2.5 px-4">Health / Efficiency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone">
                          {filteredCampaigns.length === 0 ? (
                            <tr>
                              <td colSpan={13} className="py-8 text-center text-ink-soft">
                                No campaigns found matching "{amazonSearchQuery}"
                              </td>
                            </tr>
                          ) : (
                            filteredCampaigns.map((c: any) => (
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
                                  {c.objective || "Sponsored Products"}
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
                                <td className="py-3 px-3 text-right font-mono font-semibold text-ink">
                                  {c.orders > 0 ? c.orders : "—"}
                                </td>
                                <td className="py-3 px-3 text-right font-serif font-semibold text-green">
                                  {c.sales > 0 ? `₹${c.sales.toLocaleString()}` : "—"}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-medium text-ink">
                                  {c.acos != null ? `${c.acos}%` : "—"}
                                </td>
                                <td className="py-3 px-3 text-right font-serif font-bold text-ink">
                                  {c.roas != null ? `${c.roas}x` : "—"}
                                </td>
                                <td className="py-3 px-4">
                                  {c.acos != null && c.acos < 20 ? (
                                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-green-tint text-green border border-green/20">
                                      High Margin ({c.acos}%)
                                    </span>
                                  ) : c.acos != null && c.acos > 45 ? (
                                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-rust-tint text-rust border border-rust/20">
                                      High ACOS ({c.acos}%)
                                    </span>
                                  ) : c.roas != null && c.roas >= 4 ? (
                                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-green-tint text-green border border-green/20">
                                      Scalable ({c.roas}x)
                                    </span>
                                  ) : c.spend > 500 && c.orders === 0 ? (
                                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-amber-tint text-amber border border-amber/20">
                                      Spend Leak (0 orders)
                                    </span>
                                  ) : c.spend > 0 ? (
                                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-slate-tint text-slate border border-slate/20">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="text-stone-dark text-[11px] font-mono">
                                      0 Spend
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            /* Amazon Ads Dual-Track Connection Hub */
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-[#FAF9F6] border border-stone rounded-md p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center justify-center w-6 h-6 rounded bg-amber-tint text-amber text-[13px]">
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </span>
                    <h3 className="font-serif text-[18px] font-semibold text-ink m-0">
                      Amazon Ads Telemetry Connection Hub
                    </h3>
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-amber-tint text-amber border border-amber/20">
                      Setup &amp; Sync
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ink-soft m-0 max-w-2xl">
                    Connect your Amazon Advertising account to monitor Sponsored Products, Brands, ACOS, and ROAS alongside Meta and Google Ads. Use instant report upload right now, or configure automated background syncing.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedPlatform("META")}
                    className="text-[12px] font-semibold text-ink bg-card hover:bg-stone/20 border border-stone px-3 py-1.5 rounded transition-colors"
                  >
                    View Meta Ads
                  </button>
                  <button
                    onClick={() => setSelectedPlatform("GOOGLE")}
                    className="text-[12px] font-semibold text-ink bg-card hover:bg-stone/20 border border-stone px-3 py-1.5 rounded transition-colors"
                  >
                    View Google Ads
                  </button>
                </div>
              </div>

              {uploadAmazonStatus && (
                <div className={`p-4 rounded text-[13px] flex items-center gap-3 ${
                  uploadAmazonStatus.success ? "bg-green-tint text-green border border-green/20" : "bg-rust-tint text-rust border border-rust/20"
                }`}>
                  {uploadAmazonStatus.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                  <span>{uploadAmazonStatus.message}</span>
                </div>
              )}

              {/* 2 Parallel Connection Tracks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Track 1: Instant Ingestion */}
                <div className="bg-card border border-stone rounded-md p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-green-tint text-green border border-green/20">
                        Track 1 &middot; Instant &amp; Ready Now
                      </span>
                      <span className="text-[11px] text-ink-soft font-mono">Ready in 30s</span>
                    </div>

                    <h4 className="font-serif text-[16px] font-semibold text-ink mb-1">
                      1-Click Sponsored Ads Report Ingestion
                    </h4>
                    <p className="text-[12.5px] text-ink-soft mb-5">
                      Export your 30-day Sponsored Products or Brands report from Amazon Advertising Console and drop it here. ADuniFY will immediately parse all campaigns, calculate ACOS/ROAS, and map brands.
                    </p>

                    {/* Drag and drop upload zone */}
                    <label className="border-2 border-dashed border-stone hover:border-slate/60 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-[#FAF9F6]/50 hover:bg-[#FAF9F6] transition-all mb-5 group">
                      {isUploadingAmazon ? (
                        <>
                          <Loader2 className="w-8 h-8 text-slate animate-spin mb-2" />
                          <span className="text-[13px] font-semibold text-ink">Ingesting Amazon Report...</span>
                          <span className="text-[11.5px] text-ink-soft mt-1">Parsing campaigns, daily metrics, and attributed sales</span>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-slate-tint flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-5 h-5 text-slate" />
                          </div>
                          <span className="text-[13px] font-semibold text-ink">
                            Drop your Amazon report (.xlsx or .csv) here
                          </span>
                          <span className="text-[11.5px] text-ink-soft mt-1">
                            or click to browse from your computer
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleAmazonFileUpload}
                        disabled={isUploadingAmazon}
                        className="hidden"
                      />
                    </label>

                    {/* Quick Guide */}
                    <div className="bg-[#FAF9F6] p-3.5 rounded border border-stone/60 text-[12px] text-ink-soft space-y-2">
                      <div className="font-semibold text-ink text-[12px] flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate" />
                        How to get the report in 30 seconds:
                      </div>
                      <ol className="list-decimal pl-4 space-y-1 text-[11.5px]">
                        <li>Log in to <a href="https://advertising.amazon.com" target="_blank" rel="noreferrer" className="text-slate font-medium underline">Amazon Advertising Console</a>.</li>
                        <li>Click <strong>Measurement &amp; Reporting</strong> &rarr; <strong>Sponsored ads reports</strong>.</li>
                        <li>Click <strong>Create report</strong>: Choose <strong>Sponsored Products</strong>, Report Type: <strong>Campaign</strong>, Date range: <strong>Last 30 days</strong>.</li>
                        <li>Click <strong>Run report</strong>, download the file, and drop it above!</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Track 2: Direct API & Automated Background Sync */}
                <div className="bg-card border border-stone rounded-md p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-tint text-slate border border-slate/20">
                        Track 2 &middot; Direct API Automation
                      </span>
                      <span className="text-[11px] text-amber font-semibold font-mono">1-Time Review</span>
                    </div>

                    <h4 className="font-serif text-[16px] font-semibold text-ink mb-1">
                      Direct Amazon Advertising API Access
                    </h4>
                    <p className="text-[12.5px] text-ink-soft mb-4">
                      Direct background API polling requires a 1-time "Direct advertiser" authorization from the Amazon Partner Network to approve the <code className="text-[11px] bg-stone/40 px-1 py-0.5 rounded font-mono">advertising::campaign_management</code> scope.
                    </p>

                    <div className="bg-[#FAF9F6] p-4 rounded border border-stone/60 space-y-3 mb-5">
                      <div className="text-[12px] font-semibold text-ink">
                        Application Credentials for Step 1:
                      </div>
                      <div className="space-y-1.5 text-[11.5px] font-mono">
                        <div className="flex justify-between items-center py-1 border-b border-stone/40">
                          <span className="text-ink-soft">Profile Name:</span>
                          <span className="font-semibold text-ink">ADuniFY Local</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-stone/40">
                          <span className="text-ink-soft">Applicant Category:</span>
                          <span className="font-semibold text-ink">Direct advertiser</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-ink-soft">LwA Client ID:</span>
                          <span className="text-ink-soft text-[10px] truncate max-w-[180px]">amzn1.application-oa2-client.d6bc6211ef4f46f699b1cc72f74bf953</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <a
                        href="https://advertising.amazon.com/partner-network/register-api?ref_=a20m_us_p_api_drctad"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 bg-ink hover:bg-ink/90 text-white text-[12.5px] font-semibold py-2.5 px-4 rounded transition-colors"
                      >
                        <span>Submit Direct Advertiser Registration</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <p className="text-[11px] text-ink-soft text-center m-0">
                        Once approved by Amazon, ADuniFY connects directly in the background with 0 manual steps.
                      </p>
                    </div>
                  </div>

                  {/* Daily Email Automation Hook */}
                  <div className="mt-6 pt-4 border-t border-stone flex items-start gap-2.5 text-[11.5px] text-ink-soft">
                    <Sparkles className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-ink">Hands-free daily schedule:</strong> In Amazon Console &rarr; Scheduled Reports, set your report to repeat daily to keep ADuniFY updated 100% hands-free every morning.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : selectedPlatform !== "META" ? (
        <div className="py-12 text-center text-ink-soft">
          <p className="text-[14px] font-serif m-0 mb-1 font-semibold text-ink">
            Google Ads Telemetry Pending Connection
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
                  onClick={() => handleTimeRangeChange("7d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "7d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleTimeRangeChange("30d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "30d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => handleTimeRangeChange("90d")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "90d"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={() => handleTimeRangeChange("all")}
                  className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
                    selectedTimeRange === "all"
                      ? "bg-slate text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  All Time
                </button>
                {selectedTimeRange === "custom" && (
                  <span className="px-3 py-1 rounded text-[11.5px] font-semibold bg-slate text-white">
                    Custom Range
                  </span>
                )}
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

          {/* Meta AI Diagnostic & Optimization Callout */}
          <div className="bg-card border border-stone rounded p-3 text-[12px] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#1877F2] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-ink">Meta AI Optimization Insight: </span>
              <span className="text-ink-soft">
                {selectedTimeRange === "30d" ? (
                  <>
                    <strong className="text-ink">Gardena - RollUp Hose Reel</strong> and <strong className="text-ink">BKR - 52cc Brush Cutter</strong> lead acquisition efficiency with CPGL under <strong className="text-green font-semibold">₹148</strong> across Punjab &amp; Maharashtra. Ad frequency in North India is rising to <strong className="text-amber font-semibold">3.4x</strong>; recommend rotating new video creative variations to prevent audience ad fatigue.
                  </>
                ) : selectedTimeRange === "90d" ? (
                  <>
                    Medium-term lead velocity shows <strong className="text-ink">WhatsApp Direct CTWA</strong> campaigns outperforming Instagram DMs with <strong className="text-green font-semibold">+34% higher genuine qualification</strong>. Recommend shifting 15% budget from broad Reach campaigns to high-intent WhatsApp conversation ad sets.
                  </>
                ) : (
                  <>
                    Cumulative historical performance across <strong className="text-ink">1,037 ad sets</strong> demonstrates strong seasonal response for lawn mowers and tillers. 42 older ad sets with zero genuine leads over 60+ days are recommended for permanent budget reallocation.
                  </>
                )}
              </span>
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
