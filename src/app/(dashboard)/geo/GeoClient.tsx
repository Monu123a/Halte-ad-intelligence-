"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GeoReportData, AggregatedGeoRow } from "@/lib/geoIntelligence";
import {
  MapPin,
  Copy,
  Check,
  Search,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  MessageSquare,
  PhoneCall,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ExternalLink
} from "lucide-react";

export function GeoClient({ initialData }: { initialData: GeoReportData }) {
  const router = useRouter();
  const [data, setData] = useState<GeoReportData>(initialData);
  const [currentPreset, setCurrentPreset] = useState<string>(initialData.summary.selectedTimeRange || "all");
  const [currentBrand, setCurrentBrand] = useState<string>(initialData.summary.selectedBrand || "ALL");
  const [search, setSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [sortBy, setSortBy] = useState<"demand" | "leads" | "whatsapp" | "cpl" | "spend">("demand");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [expandedState, setExpandedState] = useState<string | null>(initialData.states[0]?.state || null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  useEffect(() => {
    setData(initialData);
    setCurrentPreset(initialData.summary.selectedTimeRange || "all");
    setCurrentBrand(initialData.summary.selectedBrand || "ALL");
  }, [initialData]);

  const zones = ["ALL", "North", "West", "South", "East", "Central", "North East"];

  const brandList = [
    { id: "ALL", label: "All Brands", count: data.summary.brandCounts?.ALL || 0, color: "bg-ink text-white", dot: "" },
    { id: "Gardena", label: "Gardena", count: data.summary.brandCounts?.Gardena || 0, color: "bg-green text-white", dot: "bg-green" },
    { id: "BKR", label: "BKR", count: data.summary.brandCounts?.BKR || 0, color: "bg-amber text-white", dot: "bg-amber" },
    { id: "Gorilla", label: "Gorilla", count: data.summary.brandCounts?.Gorilla || 0, color: "bg-slate text-white", dot: "bg-slate" },
    { id: "Velcro", label: "Velcro", count: data.summary.brandCounts?.Velcro || 0, color: "bg-rust text-white", dot: "bg-rust" },
    { id: "Halte All", label: "Halte All", count: data.summary.brandCounts?.["Halte All"] || 0, color: "bg-stone-dark text-white", dot: "bg-stone-dark" },
  ];

  const handleBrandChange = (brand: string) => {
    setCurrentBrand(brand);
    const params = new URLSearchParams();
    if (brand !== "ALL") params.set("brand", brand);
    if (currentPreset !== "all") params.set("timeRange", currentPreset);
    const qs = params.toString();
    router.push(qs ? `/geo?${qs}` : "/geo");
  };

  const handlePresetChange = (preset: "all" | "90d" | "30d") => {
    setCurrentPreset(preset);
    const params = new URLSearchParams();
    if (currentBrand !== "ALL") params.set("brand", currentBrand);
    if (preset !== "all") params.set("timeRange", preset);
    const qs = params.toString();
    router.push(qs ? `/geo?${qs}` : "/geo");
  };

  // Filter and sort states
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
      if (sortBy === "leads") {
        return b.leads - a.leads;
      }
      return b.totalInboundDemand - a.totalInboundDemand;
    });

  const maxVolume = Math.max(...data.states.map((s) => s.totalInboundDemand), 1);

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
    setTimeout(() => setCopiedState(null), 2200);
  };

  const getCplBadgeClass = (cplRating: AggregatedGeoRow["cplRating"]) => {
    if (cplRating.includes("Top Efficiency")) {
      return "bg-green-tint text-green border-green/20";
    }
    if (cplRating.includes("High Volume")) {
      return "bg-slate-tint text-slate border-slate/20";
    }
    if (cplRating.includes("Balanced")) {
      return "bg-amber-tint text-amber border-amber/20";
    }
    return "bg-stone/40 text-ink-soft border-stone";
  };

  return (
    <div className="space-y-7 pb-12">
      {/* 1. Executive Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-stone pb-5 gap-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="flex items-center justify-center w-7 h-7 rounded bg-green-tint text-green text-[14px]">
              <MapPin className="w-4 h-4" />
            </span>
            <h1 className="font-serif text-[30px] m-0 font-semibold text-ink tracking-tight">
              Geographical Intelligence
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Telemetry &amp; Telecom Map
            </span>
          </div>
          <p className="m-0 text-[13.5px] text-ink-soft max-w-2xl leading-relaxed">
            Real-time state and district ad performance, customer demand clusters, Indian DoT mobile prefix resolution, and media buying targeting matrix.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Segmented Control */}
          <div className="inline-flex items-center bg-stone/40 p-1 rounded-md border border-stone">
            <button
              onClick={() => handlePresetChange("all")}
              className={`px-3.5 py-1.5 rounded text-[12px] font-medium transition-all ${
                currentPreset === "all"
                  ? "bg-card text-ink font-semibold shadow-2xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handlePresetChange("90d")}
              className={`px-3.5 py-1.5 rounded text-[12px] font-medium transition-all ${
                currentPreset === "90d"
                  ? "bg-card text-ink font-semibold shadow-2xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Last 90 Days
            </button>
            <button
              onClick={() => handlePresetChange("30d")}
              className={`px-3.5 py-1.5 rounded text-[12px] font-medium transition-all ${
                currentPreset === "30d"
                  ? "bg-card text-ink font-semibold shadow-2xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Refresh Insights Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-ink text-white py-2 px-3.5 rounded text-[12.5px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing Meta..." : "Sync Fresh Data"}</span>
          </button>
        </div>
      </div>

      {/* Brand-Wise Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone/20 p-2.5 rounded-lg border border-stone">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold text-ink-soft mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Brand:
          </span>
          {brandList.map((b) => (
            <button
              key={b.id}
              onClick={() => handleBrandChange(b.id)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold flex items-center gap-1.5 transition-all ${
                currentBrand === b.id
                  ? `${b.color} shadow-2xs`
                  : "bg-card text-ink-soft border border-stone hover:text-ink hover:border-slate/40"
              }`}
            >
              {b.dot && currentBrand !== b.id && (
                <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`}></span>
              )}
              <span>{b.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                currentBrand === b.id ? "bg-white/20 text-white" : "bg-stone/50 text-ink-soft"
              }`}>
                {b.count}
              </span>
            </button>
          ))}
        </div>

        {currentBrand !== "ALL" && (
          <div className="text-[11.5px] text-ink-soft flex items-center gap-2">
            <span>Filtered to: <strong className="text-ink">{currentBrand}</strong></span>
            <button
              onClick={() => handleBrandChange("ALL")}
              className="text-[11px] underline text-rust hover:text-rust/80 font-medium"
            >
              Reset to All
            </button>
          </div>
        )}
      </div>

      {/* 2. Executive KPI Strip (Overview Style) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-stone border border-stone rounded-md overflow-hidden">
        {/* Metric 1 */}
        <div className="bg-card p-5">
          <div className="h-[2px] w-[26px] mb-3.5 bg-ink"></div>
          <div className="font-serif text-[28px] font-semibold text-ink tracking-tight">
            ₹{data.summary.totalSpend.toLocaleString()}
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1 font-medium">Total Regional Spend</div>
          <div className="text-[11px] text-stone-dark mt-2">
            {currentBrand !== "ALL" ? `${currentBrand} attribution` : currentPreset === "all" ? "Historical investment" : currentPreset === "90d" ? "Past 90 days total" : "Past 30 days total"}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-card p-5">
          <div className="h-[2px] w-[26px] mb-3.5 bg-slate"></div>
          <div className="font-serif text-[28px] font-semibold text-ink tracking-tight">
            {data.summary.totalLeads.toLocaleString()}
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1 font-medium">Meta Ad Inquiries</div>
          <div className="text-[11px] text-stone-dark mt-2">Direct messaging conversions</div>
        </div>

        {/* Metric 3 */}
        <div className="bg-card p-5">
          <div className="h-[2px] w-[26px] mb-3.5 bg-green"></div>
          <div className="font-serif text-[28px] font-semibold text-green tracking-tight">
            {data.summary.totalWhatsAppLeads.toLocaleString()}
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1 font-medium">WhatsApp Direct CRM</div>
          <div className="text-[11px] text-stone-dark mt-2">DoT mobile circle resolved</div>
        </div>

        {/* Metric 4 */}
        <div className="bg-card p-5">
          <div className="h-[2px] w-[26px] mb-3.5 bg-amber"></div>
          <div className="font-serif text-[28px] font-semibold text-ink tracking-tight">
            ₹{data.summary.avgCpl}
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1 font-medium">Average Cost Per Lead</div>
          <div className="text-[11px] text-stone-dark mt-2">Blended national Meta CPL</div>
        </div>

        {/* Metric 5 */}
        <div className="bg-card p-5 col-span-2 md:col-span-1">
          <div className="h-[2px] w-[26px] mb-3.5 bg-green"></div>
          <div className="font-serif text-[24px] font-semibold text-green truncate tracking-tight">
            {data.summary.topStateByEfficiency}
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1 font-medium">Top ROI Goldmine State</div>
          <div className="text-[11px] text-emerald-700 mt-2 font-medium">Lowest acquisition cost</div>
        </div>
      </div>

      {/* 3. Regional Zonal Pulse Strip */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-[17px] font-semibold text-ink m-0">Zonal Demand Distribution</h3>
            <span className="text-[12px] text-ink-soft font-normal">(Click any zone to filter)</span>
          </div>
          {selectedZone !== "ALL" && (
            <button
              onClick={() => setSelectedZone("ALL")}
              className="text-[11.5px] text-green font-medium hover:underline"
            >
              Reset to All Zones
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {data.zones.map((z) => {
            const isSelected = selectedZone === z.zone;
            return (
              <button
                key={z.zone}
                onClick={() => setSelectedZone(isSelected ? "ALL" : z.zone)}
                className={`p-3.5 rounded border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? "bg-slate text-white border-slate"
                    : "bg-card border-stone text-ink hover:border-slate/40"
                }`}
              >
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[12.5px] font-semibold">{z.zone}</span>
                  <span className={`text-[11px] font-bold ${isSelected ? "text-stone" : "text-ink-soft"}`}>
                    {z.sharePct}%
                  </span>
                </div>

                <div className="text-[18px] font-serif font-semibold my-0.5">
                  {z.leads.toLocaleString()}{" "}
                  <span className={`text-[10.5px] font-sans font-normal ${isSelected ? "text-stone" : "text-ink-soft"}`}>
                    inquiries
                  </span>
                </div>

                <div className={`text-[11px] mt-1 ${isSelected ? "text-stone-dark" : "text-ink-soft"}`}>
                  Avg CPL: <b className={isSelected ? "text-white" : "text-ink"}>₹{z.cpl}</b>
                </div>

                {/* Visual mini-bar */}
                <div className="w-full bg-stone/30 h-1 mt-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isSelected ? "bg-white" : "bg-green"}`}
                    style={{ width: `${Math.min(z.sharePct * 2, 100)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Filter & Search Controls Bar */}
      <div className="bg-card border border-stone rounded-md p-3.5 flex flex-wrap gap-3 justify-between items-center">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[260px] bg-stone/20 px-3 py-1.5 rounded border border-stone/60">
          <Search className="w-4 h-4 text-ink-soft" />
          <input
            type="text"
            placeholder="Search state, district (Pune, Ludhiana, Shimla) or product (chainsaw, drip)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[13px] bg-transparent outline-none text-ink placeholder:text-stone-dark font-sans"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-ink-soft hover:text-ink text-[12px] px-1">
              ✕
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Zone Dropdown */}
          <div className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            <span className="font-medium">Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="border border-stone rounded px-2.5 py-1.5 bg-card text-ink text-[12px] font-medium outline-none cursor-pointer"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z === "ALL" ? "All Zones" : `${z} Zone`}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            <span className="font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-stone rounded px-2.5 py-1.5 bg-card text-ink text-[12px] font-medium outline-none cursor-pointer"
            >
              <option value="demand">Combined Demand (Meta + WA)</option>
              <option value="leads">Meta Inquiries (High to Low)</option>
              <option value="whatsapp">WhatsApp CRM Leads</option>
              <option value="cpl">Cost Per Lead (Lowest First)</option>
              <option value="spend">Ad Spend (High to Low)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex items-center bg-stone/30 p-0.5 rounded border border-stone">
            <button
              onClick={() => setViewMode("cards")}
              title="Dossier Cards View"
              className={`p-1.5 rounded text-[12px] transition-colors ${
                viewMode === "cards" ? "bg-card text-ink shadow-2xs" : "text-ink-soft hover:text-ink"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Compact Data Table View"
              className={`p-1.5 rounded text-[12px] transition-colors ${
                viewMode === "table" ? "bg-card text-ink shadow-2xs" : "text-ink-soft hover:text-ink"
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Result Count Status */}
      <div className="flex justify-between items-center text-[12.5px] text-ink-soft px-1">
        <div>
          Showing <b>{filteredStates.length}</b> of <b>{data.states.length}</b> regions
          {currentBrand !== "ALL" && <span> for <b className="text-ink">{currentBrand}</b></span>}
          {selectedZone !== "ALL" && <span> in <b>{selectedZone} Zone</b></span>}
          {search && <span> matching &ldquo;{search}&rdquo;</span>}
        </div>
        <div className="text-[11.5px] text-stone-dark">
          Click any state to view targeting districts &amp; copy location lists
        </div>
      </div>

      {/* 5A. VIEW MODE: Detailed Dossier Cards */}
      {viewMode === "cards" && (
        <div className="space-y-3.5">
          {filteredStates.length === 0 ? (
            <div className="bg-card p-12 border border-stone rounded-md text-center text-ink-soft">
              No regions match your search or filter criteria.
            </div>
          ) : (
            filteredStates.map((row, idx) => {
              const isExpanded = expandedState === row.state;
              const volumePct = Math.round((row.totalInboundDemand / maxVolume) * 100);

              return (
                <div
                  key={row.state}
                  className="bg-card border border-stone rounded-md overflow-hidden transition-all hover:border-slate/40"
                >
                  {/* Card Header Row */}
                  <div
                    onClick={() => setExpandedState(isExpanded ? null : row.state)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer select-none gap-4 hover:bg-stone/5"
                  >
                    {/* Left: Identity */}
                    <div className="flex items-center gap-3.5">
                      <span className="font-serif text-[17px] font-bold text-stone-dark w-7 text-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-[18px] font-bold text-ink">
                            {row.state}
                          </span>
                          <span className="text-[10.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-tint text-slate">
                            {row.zone} Zone
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getCplBadgeClass(row.cplRating)}`}>
                            {row.cplRating}
                          </span>
                        </div>
                        <div className="text-[12px] text-ink-soft mt-1 flex items-center gap-2">
                          <span className="text-stone-dark">Top Markets:</span>
                          <span className="font-medium text-ink">
                            {row.topDistricts.slice(0, 3).join(", ")}
                          </span>
                          <span className="text-stone-dark">+{row.topDistricts.length - 3} more</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Metrics & Badges */}
                    <div className="flex items-center gap-6 sm:gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-stone/50">
                      {/* Inbound Volume */}
                      <div className="text-left md:text-right">
                        <div className="font-serif text-[18px] font-semibold text-ink flex items-center md:justify-end gap-1.5">
                          <span>{row.totalInboundDemand.toLocaleString()}</span>
                          <span className="text-[11px] font-sans font-normal text-ink-soft">total</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-soft mt-0.5">
                          <span>{row.leads.toLocaleString()} Meta</span>
                          {row.whatsAppLeads > 0 && (
                            <>
                              <span className="text-stone-dark">•</span>
                              <span className="font-semibold text-emerald-700">+{row.whatsAppLeads} WA</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Cost Per Lead */}
                      <div className="text-left md:text-right min-w-[80px]">
                        <div className="font-serif text-[18px] font-bold text-ink">
                          ₹{row.cpl}
                        </div>
                        <div className="text-[11px] text-ink-soft">Cost Per Lead</div>
                      </div>

                      {/* Ad Spend */}
                      <div className="text-left md:text-right min-w-[85px] hidden sm:block">
                        <div className="font-serif text-[16px] font-semibold text-ink">
                          ₹{row.spend.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-ink-soft">Ad Spend</div>
                      </div>

                      {/* Chevron */}
                      <div className="text-ink-soft pl-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Volume Share Bar */}
                  <div className="w-full bg-stone/20 h-[3px]">
                    <div
                      className="h-full bg-green transition-all"
                      style={{ width: `${Math.max(volumePct, 2)}%` }}
                    />
                  </div>

                  {/* Expanded Targeting Dossier Drawer */}
                  {isExpanded && (
                    <div className="border-t border-stone bg-[#FAF9F6] p-5 sm:p-6 space-y-5">
                      {/* Strip: Inbound Channel Split */}
                      <div className="bg-card p-3.5 rounded border border-stone flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="font-bold text-ink flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-green" /> Regional Customer Demand Split:
                          </span>
                          <span className="text-ink-soft">
                            Meta Ad Chats: <b className="text-ink font-semibold">{row.leads.toLocaleString()}</b>
                          </span>
                          <span className="text-stone-dark">•</span>
                          <span className="text-ink-soft">
                            WhatsApp CRM Leads: <b className="text-emerald-700 font-semibold">{row.whatsAppLeads.toLocaleString()}</b>
                          </span>
                          <span className="text-stone-dark">•</span>
                          <span className="text-ink-soft">
                            National Share: <b className="text-ink font-semibold">{row.nationalSharePct}%</b>
                          </span>
                        </div>
                        <div className="text-[11.5px] text-ink-soft">
                          Blended Acquisition Cost: <b className="text-ink font-semibold">₹{row.cpl} / lead</b>
                        </div>
                      </div>

                      {/* Panel 1: Cities & Districts Targeting Matrix */}
                      <div>
                        <div className="flex justify-between items-center mb-2.5">
                          <span className="text-[11.5px] font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-green" />
                            Best Cities &amp; Districts to Target in Meta Ads Manager ({row.topDistricts.length} Locations)
                          </span>
                          <button
                            onClick={() => copyToClipboard(row.state, row.topDistricts)}
                            className="text-[11.5px] font-semibold text-ink hover:text-green flex items-center gap-1.5 bg-card border border-stone px-3 py-1 rounded transition-colors"
                          >
                            {copiedState === row.state ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green" />
                                <span className="text-green">Copied to Clipboard!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-ink-soft" />
                                <span>Copy Cities for Meta Ads</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {row.topDistricts.map((district) => (
                            <span
                              key={district}
                              className="text-[12px] bg-card border border-stone px-2.5 py-1 rounded-sm text-ink font-medium hover:border-slate/40 transition-colors"
                            >
                              {district}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Panel 2 & 3: Product Fit & Creative Angle */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-card p-4 rounded border border-stone space-y-2.5">
                          <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber" />
                            Best Converting Products for {row.state}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {row.recommendedProducts.map((p) => (
                              <span
                                key={p}
                                className="text-[11.5px] font-semibold px-2.5 py-0.5 rounded bg-green-tint text-green border border-green/20"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                          <div className="text-[12px] text-ink-soft pt-2 border-t border-stone">
                            <b>Seasonality Note:</b> {row.seasonalityNotes}
                          </div>
                        </div>

                        <div className="bg-card p-4 rounded border border-stone">
                          <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-soft mb-2 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-slate" />
                            Media Buyer Strategy &amp; Ad Creative Angle
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
      )}

      {/* 5B. VIEW MODE: Compact Executive Data Table */}
      {viewMode === "table" && (
        <div className="bg-card border border-stone rounded-md overflow-x-auto">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-stone bg-stone/20 text-ink-soft uppercase text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">State / Region</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4 text-right">Meta Chats</th>
                <th className="py-3 px-4 text-right">WhatsApp Leads</th>
                <th className="py-3 px-4 text-right">Total Demand</th>
                <th className="py-3 px-4 text-right">Ad Spend</th>
                <th className="py-3 px-4 text-right">CPL</th>
                <th className="py-3 px-4 text-center">Rating</th>
                <th className="py-3 px-4 text-right">Districts Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {filteredStates.map((row, idx) => (
                <tr key={row.state} className="hover:bg-stone/10 transition-colors">
                  <td className="py-3 px-4 font-bold text-stone-dark">#{idx + 1}</td>
                  <td className="py-3 px-4 font-bold font-serif text-[15px] text-ink">
                    {row.state}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-tint text-slate">
                      {row.zone}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{row.leads.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                    {row.whatsAppLeads > 0 ? `+${row.whatsAppLeads}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-bold font-serif text-[15px] text-ink">
                    {row.totalInboundDemand.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-ink font-medium">₹{row.spend.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-bold text-ink">₹{row.cpl}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border inline-block ${getCplBadgeClass(row.cplRating)}`}>
                      {row.cplRating}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => copyToClipboard(row.state, row.topDistricts)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 bg-stone/20 hover:bg-stone/40 text-ink rounded transition-colors"
                      title="Copy targeting districts"
                    >
                      {copiedState === row.state ? (
                        <>
                          <Check className="w-3 h-3 text-green" />
                          <span className="text-green font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-ink-soft" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Ads Team Quick Playbook */}
      <div className="bg-slate text-stone p-6 rounded-md border border-slate-dark">
        <h4 className="font-serif text-[18px] text-white font-semibold m-0 mb-2">
          Ads Team Strategic Playbook for Geographical Allocation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[12.5px] mt-4">
          <div>
            <b className="text-white block mb-1">1. Scale Budget in Low-CPL Goldmines</b>
            <p className="text-stone-dark m-0 leading-relaxed">
              States like <b>Himachal Pradesh (₹27/lead)</b>, <b>Delhi NCR (₹39/lead)</b>, and <b>Kerala (₹39/lead)</b> produce the highest customer inquiry margins in the country. Scale daily spend here to maximize acquisition efficiency.
            </p>
          </div>
          <div>
            <b className="text-white block mb-1">2. Core Volume Anchors</b>
            <p className="text-stone-dark m-0 leading-relaxed">
              <b>Maharashtra</b> and <b>Uttar Pradesh</b> drive nearly 30% of all national inquiries. Maintain an evergreen baseline budget in these two states to ensure consistent dealer and retail pipeline flow.
            </p>
          </div>
          <div>
            <b className="text-white block mb-1">3. Pinpoint City-Level Ad Sets</b>
            <p className="text-stone-dark m-0 leading-relaxed">
              Avoid broad pan-India targeting which leaks ad spend into unserviceable remote locations. Use the <b>&quot;Copy Cities for Meta Ads&quot;</b> button above to paste verified Tier-1 &amp; Tier-2 districts straight into Ads Manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
