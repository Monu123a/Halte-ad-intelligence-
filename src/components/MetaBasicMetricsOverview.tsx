"use client";

import { useState } from "react";
import Link from "next/link";
import { MetaBasicMetricsReport, StateBasicMetric } from "@/lib/metaBasicMetrics";
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
  Sparkles
} from "lucide-react";

export function MetaBasicMetricsOverview({ data }: { data: MetaBasicMetricsReport }) {
  const [selectedPlatform, setSelectedPlatform] = useState<"META" | "GOOGLE" | "AMAZON">("META");
  const [selectedTimeRange, setSelectedTimeRange] = useState<"all" | "90d" | "30d">("all");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [copiedState, setCopiedState] = useState<string | null>(null);

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
            <span className="w-2 h-2 rounded-full bg-stone-dark"></span>
            <span>Google Ads</span>
            <span className="text-[10px] text-stone-dark font-normal">(Next)</span>
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

      {selectedPlatform !== "META" ? (
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
