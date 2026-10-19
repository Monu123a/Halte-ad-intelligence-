"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GeoReportData, AggregatedGeoRow } from "@/lib/geoIntelligence";

export function GeoClient({ initialData }: { initialData: GeoReportData }) {
  const router = useRouter();
  const [data, setData] = useState<GeoReportData>(initialData);
  const [currentPreset, setCurrentPreset] = useState<string>(initialData.summary.selectedTimeRange || "all");
  const [search, setSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [sortBy, setSortBy] = useState<"leads" | "cpl" | "spend" | "whatsapp" | "demand">("leads");
  const [expandedState, setExpandedState] = useState<string | null>(initialData.states[0]?.state || null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  useEffect(() => {
    setData(initialData);
    setCurrentPreset(initialData.summary.selectedTimeRange || "all");
  }, [initialData]);

  const zones = ["ALL", "North", "West", "South", "East", "Central", "North East"];

  const handlePresetChange = (preset: "all" | "90d" | "30d") => {
    setCurrentPreset(preset);
    router.push(preset === "all" ? "/geo" : `/geo?timeRange=${preset}`);
  };

  // Filter and sort
  const filteredStates = data.states
    .filter((s) => {
      const matchesZone = selectedZone === "ALL" || s.zone === selectedZone;
      const q = search.toLowerCase().trim();
      if (!q) return matchesZone;

      const matchesSearch =
        s.state.toLowerCase().includes(q) ||
        s.topDistricts.some((d) => d.toLowerCase().includes(q)) ||
        s.recommendedProducts.some((p) => p.toLowerCase().includes(q)) ||
        s.adStrategyTip.toLowerCase().includes(q);

      return matchesZone && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "cpl") {
        if (a.cpl === 0) return 1;
        if (b.cpl === 0) return -1;
        return a.cpl - b.cpl;
      }
      if (sortBy === "spend") {
        return b.spend - a.spend;
      }
      if (sortBy === "whatsapp") {
        return b.whatsAppLeads - a.whatsAppLeads;
      }
      if (sortBy === "demand") {
        return b.totalInboundDemand - a.totalInboundDemand;
      }
      return b.leads - a.leads;
    });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync/geo", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (stateName: string, districts: string[]) => {
    const text = districts.join(", ");
    navigator.clipboard.writeText(text);
    setCopiedState(stateName);
    setTimeout(() => setCopiedState(null), 2500);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-stone pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📍</span>
            <h1 className="font-serif text-[30px] m-0 font-semibold text-ink">Geographical Intelligence</h1>
          </div>
          <p className="m-0 text-[13.5px] text-ink-soft">
            State, city &amp; district ad performance, WhatsApp lead geolocation, and media buying campaign matrix
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Time Range Toggle Pills */}
          <div className="flex bg-stone/40 p-1 rounded border border-stone">
            <button
              onClick={() => handlePresetChange("all")}
              className={`px-3 py-1.5 rounded-sm text-[12px] font-semibold transition-all ${
                currentPreset === "all"
                  ? "bg-white text-ink shadow-2xs font-bold"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handlePresetChange("90d")}
              className={`px-3 py-1.5 rounded-sm text-[12px] font-semibold transition-all ${
                currentPreset === "90d"
                  ? "bg-white text-ink shadow-2xs font-bold"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Last 90 Days
            </button>
            <button
              onClick={() => handlePresetChange("30d")}
              className={`px-3 py-1.5 rounded-sm text-[12px] font-semibold transition-all ${
                currentPreset === "30d"
                  ? "bg-white text-ink shadow-2xs font-bold"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-ink text-white py-2 px-4 rounded-sm text-[12.5px] font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Syncing Meta Geo Data...
              </>
            ) : (
              <>
                <span>🔄</span>
                Refresh Geo Insights
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-stone border border-stone rounded-md overflow-hidden mb-8">
        <div className="bg-card p-5">
          <div className="text-[12px] text-ink-soft mb-1 font-medium">Total Regional Spend</div>
          <div className="font-serif text-[26px] font-semibold text-ink">
            ₹{data.summary.totalSpend.toLocaleString()}
          </div>
          <div className="text-[11px] text-ink-soft mt-1">
            {currentPreset === "all"
              ? "All-time ad investment"
              : currentPreset === "90d"
              ? "Past 90 days spend"
              : "Past 30 days spend"}
          </div>
        </div>

        <div className="bg-card p-5">
          <div className="text-[12px] text-ink-soft mb-1 font-medium">Meta Ad Inquiries</div>
          <div className="font-serif text-[26px] font-semibold text-ink">
            {data.summary.totalLeads.toLocaleString()}
          </div>
          <div className="text-[11px] text-ink-soft mt-1">Verified conversations &amp; leads</div>
        </div>

        <div className="bg-card p-5">
          <div className="text-[12px] text-ink-soft mb-1 font-medium">WhatsApp Direct Leads</div>
          <div className="font-serif text-[26px] font-semibold text-emerald-700">
            {data.summary.totalWhatsAppLeads.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">Geolocated by DoT mobile series</div>
        </div>

        <div className="bg-card p-5">
          <div className="text-[12px] text-ink-soft mb-1 font-medium">National Average CPL</div>
          <div className="font-serif text-[26px] font-semibold text-ink">
            ₹{data.summary.avgCpl}
          </div>
          <div className="text-[11px] text-ink-soft mt-1">Blended Meta Cost Per Lead</div>
        </div>

        <div className="bg-card p-5 col-span-2 md:col-span-1">
          <div className="text-[12px] text-ink-soft mb-1 font-medium">Top ROI Goldmine State</div>
          <div className="font-serif text-[24px] font-semibold text-emerald-700 truncate">
            {data.summary.topStateByEfficiency}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">Lowest cost per inquiry in India</div>
        </div>
      </div>

      {/* Zonal Performance Bar Cards */}
      <div className="mb-8">
        <h3 className="font-serif text-[18px] font-semibold mb-3 text-ink">Regional Zonal Share</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {data.zones.map((z) => (
            <button
              key={z.zone}
              onClick={() => setSelectedZone(selectedZone === z.zone ? "ALL" : z.zone)}
              className={`p-4 rounded-md border text-left transition-all ${
                selectedZone === z.zone
                  ? "bg-slate text-white border-slate shadow-sm"
                  : "bg-card border-stone text-ink hover:border-slate/50"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[13px] font-bold">{z.zone} Zone</span>
                <span className={`text-[11px] font-bold ${selectedZone === z.zone ? "text-stone" : "text-ink-soft"}`}>
                  {z.sharePct}%
                </span>
              </div>
              <div className="text-[20px] font-serif font-semibold">
                {z.leads.toLocaleString()} <span className="text-[11px] font-sans font-normal opacity-80">inquiries</span>
              </div>
              <div className={`text-[11px] mt-1 ${selectedZone === z.zone ? "text-stone" : "text-ink-soft"}`}>
                Avg CPL: ₹{z.cpl}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-card border border-stone rounded-md p-4 mb-6 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-2 items-center flex-1 min-w-[260px]">
          <span className="text-ink-soft text-[14px]">🔍</span>
          <input
            type="text"
            placeholder="Search state, city, district (e.g. Pune, Ludhiana, Shimla) or product (chainsaw, drip)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[13px] bg-transparent outline-none text-ink placeholder:text-stone-dark"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-ink-soft hover:text-ink text-[12px]">
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            <span>Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="border border-stone rounded-sm px-2 py-1 bg-white text-ink font-medium"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z === "ALL" ? "All Zones" : `${z} Zone`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            <span>Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-stone rounded-sm px-2 py-1 bg-white text-ink font-medium"
            >
              <option value="leads">Meta Inquiries (High to Low)</option>
              <option value="whatsapp">WhatsApp Direct CRM Leads</option>
              <option value="demand">Combined Total Demand</option>
              <option value="cpl">Cost Per Lead (Lowest First)</option>
              <option value="spend">Ad Spend (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* States Ranking & Targeting Matrix */}
      <div className="space-y-4 mb-10">
        {filteredStates.length === 0 ? (
          <div className="bg-card p-10 border border-stone rounded-md text-center text-ink-soft">
            No geographical regions match your search criteria.
          </div>
        ) : (
          filteredStates.map((row, idx) => {
            const isExpanded = expandedState === row.state;

            return (
              <div
                key={row.state}
                className="bg-card border border-stone rounded-md overflow-hidden transition-shadow hover:shadow-sm"
              >
                {/* Main Row Bar */}
                <div
                  onClick={() => setExpandedState(isExpanded ? null : row.state)}
                  className="p-5 flex justify-between items-center cursor-pointer select-none hover:bg-stone/10"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-serif text-[18px] font-bold text-stone-dark w-7 text-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-serif text-[17px] font-bold text-ink">{row.state}</span>
                        <span className="text-[10.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone/40 text-ink-soft">
                          {row.zone} Zone
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${row.cplColor}`}>
                          {row.cplRating}
                        </span>
                      </div>
                      <div className="text-[12px] text-ink-soft mt-1 flex items-center gap-3">
                        <span>
                          Top Markets: <b>{row.topDistricts.slice(0, 3).join(", ")}</b> +{row.topDistricts.length - 3} more
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="font-serif text-[18px] font-semibold text-ink flex items-center justify-end gap-1.5">
                        <span>{row.leads.toLocaleString()}</span>
                        <span className="text-[11px] font-sans font-normal text-ink-soft">Meta</span>
                        {row.whatsAppLeads > 0 && (
                          <span
                            title="Direct WhatsApp CRM leads resolved via phone prefix"
                            className="text-[10.5px] font-sans font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                          >
                            +{row.whatsAppLeads} WA
                          </span>
                        )}
                      </div>
                      <div className="text-[11.5px] text-ink-soft">
                        {row.nationalSharePct}% national volume
                      </div>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <div className="font-serif text-[18px] font-bold text-ink">
                        ₹{row.cpl}
                      </div>
                      <div className="text-[11px] text-ink-soft">Cost Per Lead</div>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <div className="font-serif text-[16px] font-semibold text-ink">
                        ₹{row.spend.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-ink-soft">Total Ad Spend</div>
                    </div>

                    <div className="text-ink-soft text-[14px] pl-2">
                      {isExpanded ? "▲" : "▼"}
                    </div>
                  </div>
                </div>

                {/* Expanded Target Cities & Campaign Dossier */}
                {isExpanded && (
                  <div className="border-t border-stone bg-[#FAF9F6] p-6 space-y-5">
                    {/* Channel Breakdown Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded border border-stone text-[12.5px]">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-bold text-ink flex items-center gap-1.5">
                          <span>📊</span> Regional Inbound Breakdown:
                        </span>
                        <span className="text-ink-soft">
                          Meta Ad Conversations: <b className="text-ink">{row.leads.toLocaleString()}</b>
                        </span>
                        <span className="text-stone-dark">•</span>
                        <span className="text-ink-soft">
                          Direct WhatsApp Leads: <b className="text-emerald-700">{row.whatsAppLeads.toLocaleString()}</b>
                        </span>
                        <span className="text-stone-dark">•</span>
                        <span className="text-ink-soft">
                          Combined Customer Demand: <b className="text-ink">{(row.leads + row.whatsAppLeads).toLocaleString()}</b>
                        </span>
                      </div>
                      <div className="text-[11.5px] text-ink-soft">
                        Blended Acquisition Cost: <b>₹{row.cpl} / lead</b>
                      </div>
                    </div>

                    {/* Cities / Districts Grid */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                          <span>📍</span> Best Cities &amp; Districts to Target in Meta Ads Manager
                        </span>
                        <button
                          onClick={() => copyToClipboard(row.state, row.topDistricts)}
                          className="text-[11.5px] font-semibold text-ink hover:text-green flex items-center gap-1 bg-card border border-stone px-2.5 py-1 rounded shadow-2xs transition-colors"
                        >
                          {copiedState === row.state ? "✅ Copied to Clipboard!" : "📋 Copy Cities List"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {row.topDistricts.map((district) => (
                          <span
                            key={district}
                            className="text-[12px] bg-card border border-stone px-2.5 py-1 rounded-sm text-ink font-medium"
                          >
                            {district}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Product-Market Fit & Ad Strategy Tip */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-card p-4 rounded border border-stone">
                        <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-soft mb-2 flex items-center gap-1.5">
                          <span>🎯</span> Best Converting Products for {row.state}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {row.recommendedProducts.map((p) => (
                            <span
                              key={p}
                              className="text-[11.5px] font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                        <div className="text-[12px] text-ink-soft mt-2 pt-2 border-t border-stone">
                          <b>Seasonality Note:</b> {row.seasonalityNotes}
                        </div>
                      </div>

                      <div className="bg-card p-4 rounded border border-stone">
                        <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-soft mb-2 flex items-center gap-1.5">
                          <span>💡</span> Media Buyer Strategy &amp; Ad Creative Angle
                        </div>
                        <p className="text-[12.5px] text-ink leading-relaxed m-0">
                          {row.adStrategyTip}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Ads Team Quick Playbook */}
      <div className="bg-slate text-stone p-6 rounded-md border border-slate-dark">
        <h4 className="font-serif text-[18px] text-white font-semibold m-0 mb-2">
          Ads Team Strategic Playbook for Geographical Allocation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[12.5px] mt-4">
          <div>
            <b className="text-white block mb-1">1. Scale Budget in Low-CPL Goldmines</b>
            <p className="text-stone-dark m-0 leading-relaxed">
              States like <b>Himachal Pradesh (₹27/lead)</b>, <b>Delhi NCR (₹39/lead)</b>, and <b>Kerala (₹39/lead)</b> have the lowest customer acquisition costs in the country. Scale daily spend here to maximize total lead volume.
            </p>
          </div>
          <div>
            <b className="text-white block mb-1">2. Core Volume Anchors</b>
            <p className="text-stone-dark m-0 leading-relaxed">
              <b>Maharashtra</b> and <b>Uttar Pradesh</b> drive nearly 30% of all national inquiries. Keep a dedicated evergreen budget on these states to ensure consistent dealer and retail sales flow.
            </p>
          </div>
          <div>
            <b className="text-white block mb-1">3. Pinpoint City-Level Ad Sets</b>
            <p className="text-stone-dark m-0 leading-relaxed">
              Instead of broad pan-India targeting which wastes budget in low-intent remote areas, use the <b>&quot;Copy Cities List&quot;</b> button above to paste top tier-1 and tier-2 districts directly into Meta Ads Manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
