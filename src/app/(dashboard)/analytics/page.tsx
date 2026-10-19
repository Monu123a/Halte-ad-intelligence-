import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWebsiteAnalyticsData, formatDuration } from "@/lib/analyticsService";
import { runWebsiteAnalyticsSync } from "@/lib/sync/websiteAnalyticsSync";

export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  searchParams: {
    days?: string;
    brand?: string;
    page?: string;
    q?: string;
    sync?: string;
  };
}

export default async function WebsiteAnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const session = await getSession();
  if (session?.role === "LEAD_TAGGER") {
    redirect("/leads");
  }
  if (searchParams.sync === "true") {
    try {
      await runWebsiteAnalyticsSync();
    } catch (e) {
      console.warn("Manual sync error:", e);
    }
  }

  const days = parseInt(searchParams.days || "30", 10);
  const brand = searchParams.brand || "ALL";
  const page = parseInt(searchParams.page || "1", 10);
  const searchQuery = (searchParams.q || "").toLowerCase().trim();

  const { overview, pagedPages, totalPagesCount } = await getWebsiteAnalyticsData({
    days,
    brand,
    page,
    pageSize: 15,
  });

  const filteredPages = searchQuery
    ? pagedPages.filter(
        (p) =>
          p.pagePath.toLowerCase().includes(searchQuery) ||
          p.pageTitle.toLowerCase().includes(searchQuery) ||
          (p.sku && p.sku.toLowerCase().includes(searchQuery))
      )
    : pagedPages;

  const getBrandTagClass = (brandName: string | null) => {
    if (!brandName) return "bg-stone-dark text-white";
    const b = brandName.toLowerCase();
    if (b.includes("gardena")) return "bg-green text-white";
    if (b.includes("bkr")) return "bg-amber text-white";
    if (b.includes("gorilla")) return "bg-slate text-white";
    if (b.includes("velcro")) return "bg-rust text-white";
    return "bg-stone-dark text-white";
  };

  const getBounceClass = (rate: number) => {
    if (rate <= 35) return "bg-green-tint text-green";
    if (rate <= 52) return "bg-amber-tint text-amber";
    return "bg-rust-tint text-rust";
  };

  const getTabClass = (tabBrand: string) => {
    const isActive = brand.toLowerCase() === tabBrand.toLowerCase();
    const base =
      "text-[13px] font-semibold py-[9px] px-[18px] border border-stone cursor-pointer transition-colors rounded-sm";

    if (!isActive) return `${base} bg-card text-ink-soft hover:bg-stone/20`;

    if (tabBrand === "ALL") return `${base} bg-ink border-ink text-white`;
    if (tabBrand === "Gardena") return `${base} bg-green border-green text-white`;
    if (tabBrand === "BKR") return `${base} bg-amber border-amber text-white`;
    if (tabBrand === "Gorilla") return `${base} bg-slate border-slate text-white`;
    if (tabBrand === "Velcro") return `${base} bg-rust border-rust text-white`;

    return base;
  };

  const maxDailySessions = Math.max(
    1,
    ...overview.dailyTrend.map((d) => d.sessions)
  );

  return (
    <div>
      {/* Top Header */}
      <div className="flex justify-between items-end mb-8 border-b border-stone pb-5">
        <div>
          <h1 className="font-serif text-[30px] m-0 mb-1 font-semibold">
            Website Analytics
          </h1>
          <p className="m-0 text-[13.5px] text-ink-soft">
            Halte.in customer behavior &middot; Bounce rate, time spent, scroll depth & pages viewed
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <div className="flex border border-stone rounded-md overflow-hidden bg-card text-[12px] font-semibold text-ink-soft">
            <Link
              href={`/analytics?days=7&brand=${brand}`}
              className={`px-3 py-1.5 transition-colors ${
                days === 7 ? "bg-ink text-white" : "hover:bg-stone/20"
              }`}
            >
              7D
            </Link>
            <Link
              href={`/analytics?days=30&brand=${brand}`}
              className={`px-3 py-1.5 border-l border-stone transition-colors ${
                days === 30 ? "bg-ink text-white" : "hover:bg-stone/20"
              }`}
            >
              30D
            </Link>
            <Link
              href={`/analytics?days=90&brand=${brand}`}
              className={`px-3 py-1.5 border-l border-stone transition-colors ${
                days === 90 ? "bg-ink text-white" : "hover:bg-stone/20"
              }`}
            >
              90D
            </Link>
            <Link
              href={`/analytics?days=3650&brand=${brand}`}
              className={`px-3 py-1.5 border-l border-stone transition-colors ${
                days >= 365 ? "bg-ink text-white" : "hover:bg-stone/20"
              }`}
            >
              All Time
            </Link>
          </div>

          <div className="text-[12.5px] border border-stone px-4 py-2 text-ink-soft bg-card rounded-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse"></span>
            Halte.in Live Telemetry
          </div>

          <Link
            href={`/analytics?days=${days}&brand=${brand}&sync=true`}
            className="text-[12px] font-semibold border border-stone px-3 py-2 rounded-md bg-card text-ink hover:bg-stone/30 transition-colors flex items-center gap-1.5"
            title="Fetch and sync recent visitor telemetry from Halte.in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Sync Now
          </Link>
        </div>
      </div>

      {/* Brand Navigation Tabs */}
      <div className="flex gap-2.5 mb-7">
        <Link href={`/analytics?days=${days}&brand=ALL`} className={getTabClass("ALL")}>
          All Brands
        </Link>
        <Link href={`/analytics?days=${days}&brand=Gardena`} className={getTabClass("Gardena")}>
          Gardena
        </Link>
        <Link href={`/analytics?days=${days}&brand=BKR`} className={getTabClass("BKR")}>
          BKR
        </Link>
        <Link href={`/analytics?days=${days}&brand=Gorilla`} className={getTabClass("Gorilla")}>
          Gorilla
        </Link>
        <Link href={`/analytics?days=${days}&brand=Velcro`} className={getTabClass("Velcro")}>
          Velcro
        </Link>
      </div>

      {/* Hero 5-Grid KPI Row */}
      <div className="grid grid-cols-5 gap-[1px] bg-stone border border-stone mb-7 rounded-md overflow-hidden">
        {/* Total Sessions */}
        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-ink"></div>
          <div className="font-serif text-[26px] font-semibold">
            {overview.totalSessions.toLocaleString()}
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1">Total Sessions</div>
          <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">
            {overview.uniqueVisitors.toLocaleString()} unique visitors
          </div>
        </div>

        {/* Bounce Rate */}
        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-rust"></div>
          <div className="font-serif text-[26px] font-semibold">
            {overview.bounceRate}%
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1">Bounce Rate</div>
          <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">
            Single-page visits &lt; 15s
          </div>
        </div>

        {/* Time Spent */}
        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-green"></div>
          <div className="font-serif text-[26px] font-semibold">
            {formatDuration(overview.avgSessionDurationSec)}
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1">Avg. Time Spent</div>
          <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">
            {formatDuration(overview.avgPageTimeSec)} avg. per page
          </div>
        </div>

        {/* Scroll Depth */}
        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-amber"></div>
          <div className="font-serif text-[26px] font-semibold">
            {overview.avgScrollDepthPct}%
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1">Avg. Scroll Depth</div>
          <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">
            {overview.scrollFunnel.pct50}% reach 50% depth
          </div>
        </div>

        {/* Pages Scrolled / Viewed */}
        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-slate"></div>
          <div className="font-serif text-[26px] font-semibold">
            {overview.pagesPerSession}
          </div>
          <div className="text-[12.5px] text-ink-soft mt-1">Pages / Session</div>
          <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">
            {overview.totalPageviews.toLocaleString()} total pageviews
          </div>
        </div>
      </div>

      {/* Middle Grid: Trend Chart & Scroll Depth Funnel */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-[1px] bg-stone border border-stone mb-7 rounded-md overflow-hidden">
        {/* Daily Traffic Trend */}
        <div className="bg-card p-7">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">
                Daily Traffic &amp; Session Volume
              </h3>
              <div className="text-[12.5px] text-ink-soft">
                Sessions and active pageviews over time
              </div>
            </div>
            <div className="flex gap-4 text-[11px] text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-ink inline-block"></span> Sessions
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-stone inline-block"></span> Pageviews
              </span>
            </div>
          </div>

          {overview.dailyTrend.length === 0 ? (
            <div className="py-12 text-center text-ink-soft text-[13px]">
              No trend data available for this range.
            </div>
          ) : (
            <div className="mt-4">
              <svg viewBox="0 0 540 180" width="100%" height="180">
                <line x1="20" y1="150" x2="520" y2="150" stroke="var(--stone)" strokeWidth="1" />
                <line x1="20" y1="90" x2="520" y2="90" stroke="var(--stone)" strokeWidth="1" strokeDasharray="2 3" />
                <line x1="20" y1="30" x2="520" y2="30" stroke="var(--stone)" strokeWidth="1" strokeDasharray="2 3" />

                {overview.dailyTrend.map((d, i) => {
                  const x = 35 + (i * (470 / Math.max(1, overview.dailyTrend.length - 1)));
                  const h = Math.max(6, (d.sessions / maxDailySessions) * 120);
                  const y = 150 - h;

                  return (
                    <g key={d.date} className="group">
                      <rect
                        x={x - 10}
                        y={y}
                        width="20"
                        height={h}
                        fill="var(--ink)"
                        rx="2"
                        className="hover:fill-amber transition-colors cursor-pointer"
                      />
                      <text
                        x={x}
                        y="166"
                        textAnchor="middle"
                        fontSize="9"
                        fill="var(--ink-soft)"
                        fontFamily="var(--font-inter)"
                      >
                        {d.label}
                      </text>
                      <text
                        x={x}
                        y={y - 5}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="600"
                        fill="var(--ink)"
                        fontFamily="var(--font-inter)"
                      >
                        {d.sessions}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Scroll Depth Funnel */}
        <div className="bg-card p-7">
          <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">
            Scroll Depth Funnel
          </h3>
          <div className="text-[12.5px] text-ink-soft mb-6">
            Percentage of page readers reaching each scroll milestone
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[12.5px] font-semibold mb-1">
                <span>Top 25% Scrolled</span>
                <span>{overview.scrollFunnel.pct25}% ({overview.scrollFunnel.reached25.toLocaleString()})</span>
              </div>
              <div className="w-full h-3 bg-stone rounded-sm overflow-hidden">
                <div
                  className="h-full bg-green"
                  style={{ width: `${overview.scrollFunnel.pct25}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[12.5px] font-semibold mb-1">
                <span>50% Scroll Depth (Halfway)</span>
                <span>{overview.scrollFunnel.pct50}% ({overview.scrollFunnel.reached50.toLocaleString()})</span>
              </div>
              <div className="w-full h-3 bg-stone rounded-sm overflow-hidden">
                <div
                  className="h-full bg-amber"
                  style={{ width: `${overview.scrollFunnel.pct50}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[12.5px] font-semibold mb-1">
                <span>75% Deep Scroll</span>
                <span>{overview.scrollFunnel.pct75}% ({overview.scrollFunnel.reached75.toLocaleString()})</span>
              </div>
              <div className="w-full h-3 bg-stone rounded-sm overflow-hidden">
                <div
                  className="h-full bg-slate"
                  style={{ width: `${overview.scrollFunnel.pct75}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[12.5px] font-semibold mb-1">
                <span>100% Full Page Read</span>
                <span>{overview.scrollFunnel.pct100}% ({overview.scrollFunnel.reached100.toLocaleString()})</span>
              </div>
              <div className="w-full h-3 bg-stone rounded-sm overflow-hidden">
                <div
                  className="h-full bg-rust"
                  style={{ width: `${overview.scrollFunnel.pct100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Engagement Ledger */}
      <div className="card-base p-7 mb-7">
        <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">
          Brand Engagement &amp; Dwell Breakdown
        </h3>
        <div className="text-[12.5px] text-ink-soft mb-5">
          Audience engagement, dwell time, and bounce rate across Halte catalog brands
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Brand
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Sessions
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Pageviews
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Avg. Time Spent
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Avg. Scroll Depth
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Bounce Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {overview.byBrand.map((b, i) => {
              const isLast = i === overview.byBrand.length - 1;
              return (
                <tr key={b.brand} className="hover:bg-stone/5 transition-colors">
                  <td className={`py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                    <span
                      className={`inline-block text-[11px] font-bold py-1 px-3 rounded-sm ${getBrandTagClass(
                        b.brand
                      )}`}
                    >
                      {b.brand}
                    </span>
                  </td>
                  <td className={`text-[13.5px] font-semibold py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                    {b.sessions.toLocaleString()}
                  </td>
                  <td className={`text-[13.5px] py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                    {b.pageviews.toLocaleString()}
                  </td>
                  <td className={`text-[13.5px] py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                    {formatDuration(b.avgTimeSec)}
                  </td>
                  <td className={`text-[13.5px] py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[12px] font-semibold">{b.avgScrollPct}%</span>
                      <div className="w-24 h-2 bg-stone rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-amber"
                          style={{ width: `${b.avgScrollPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className={`py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                    <span
                      className={`inline-block text-[12px] font-semibold py-0.5 px-2.5 rounded-sm ${getBounceClass(
                        b.bounceRate
                      )}`}
                    >
                      {b.bounceRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Traffic Sources & Device Grid */}
      <div className="grid grid-cols-2 gap-[1px] bg-stone border border-stone mb-7 rounded-md overflow-hidden">
        {/* Traffic Channels */}
        <div className="bg-card p-6">
          <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">
            Traffic Sources &amp; Channels
          </h3>
          <div className="text-[12.5px] text-ink-soft mb-4">
            Where shoppers are discovering Halte products
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] text-ink-soft font-semibold py-2 px-2 border-b border-stone">
                  Source
                </th>
                <th className="text-left text-[11px] text-ink-soft font-semibold py-2 px-2 border-b border-stone">
                  Share
                </th>
                <th className="text-left text-[11px] text-ink-soft font-semibold py-2 px-2 border-b border-stone">
                  Time Spent
                </th>
                <th className="text-left text-[11px] text-ink-soft font-semibold py-2 px-2 border-b border-stone">
                  Bounce Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {overview.bySource.slice(0, 5).map((s, i) => {
                const isLast = i === Math.min(5, overview.bySource.length) - 1;
                return (
                  <tr key={s.source}>
                    <td className={`py-2.5 px-2 text-[13px] font-medium ${!isLast ? "border-b border-stone" : ""}`}>
                      {s.source}
                    </td>
                    <td className={`py-2.5 px-2 text-[12.5px] ${!isLast ? "border-b border-stone" : ""}`}>
                      {s.sharePct}% ({s.sessions})
                    </td>
                    <td className={`py-2.5 px-2 text-[12.5px] ${!isLast ? "border-b border-stone" : ""}`}>
                      {formatDuration(s.avgTimeSec)}
                    </td>
                    <td className={`py-2.5 px-2 ${!isLast ? "border-b border-stone" : ""}`}>
                      <span className={`text-[11px] font-semibold py-0.5 px-2 rounded-sm ${getBounceClass(s.bounceRate)}`}>
                        {s.bounceRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Device Breakdown */}
        <div className="bg-card p-6">
          <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">
            Device Breakdown &amp; Readability
          </h3>
          <div className="text-[12.5px] text-ink-soft mb-4">
            Screen context, scroll depth, and bounce rate
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] text-ink-soft font-semibold py-2 px-2 border-b border-stone">
                  Device
                </th>
                <th className="text-left text-[11px] text-ink-soft font-semibold py-2 px-2 border-b border-stone">
                  Share
                </th>
                <th className="text-left text-[11px] text-ink-soft font-semibold py-2 px-2 border-b border-stone">
                  Scroll Depth
                </th>
                <th className="text-left text-[11px] text-ink-soft font-semibold py-2 px-2 border-b border-stone">
                  Bounce Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {overview.byDevice.map((d, i) => {
                const isLast = i === overview.byDevice.length - 1;
                return (
                  <tr key={d.device}>
                    <td className={`py-2.5 px-2 text-[13px] font-medium ${!isLast ? "border-b border-stone" : ""}`}>
                      {d.device}
                    </td>
                    <td className={`py-2.5 px-2 text-[12.5px] ${!isLast ? "border-b border-stone" : ""}`}>
                      {d.sharePct}% ({d.sessions})
                    </td>
                    <td className={`py-2.5 px-2 text-[12.5px] ${!isLast ? "border-b border-stone" : ""}`}>
                      {d.avgScrollPct}%
                    </td>
                    <td className={`py-2.5 px-2 ${!isLast ? "border-b border-stone" : ""}`}>
                      <span className={`text-[11px] font-semibold py-0.5 px-2 rounded-sm ${getBounceClass(d.bounceRate)}`}>
                        {d.bounceRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Pages & Product Deep Dive Table */}
      <div className="card-base p-7">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">
              Top Visited Pages &amp; Product Content
            </h3>
            <div className="text-[12.5px] text-ink-soft">
              Ranked by total pageviews, with time spent and scroll depth per landing page
            </div>
          </div>

          <form method="GET" action="/analytics">
            <input type="hidden" name="days" value={days} />
            <input type="hidden" name="brand" value={brand} />
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q || ""}
              placeholder="Filter by page or SKU..."
              className="text-[12.5px] px-3 py-1.5 border border-stone rounded-sm bg-card w-[220px] outline-none focus:border-stone-dark transition-colors"
            />
          </form>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Page / Product
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Brand
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Views
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Avg. Time Spent
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Avg. Scroll Depth
              </th>
              <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-3 border-b border-stone">
                Bounce Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPages.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink-soft text-[13px]">
                  No pages match your filter.
                </td>
              </tr>
            ) : (
              filteredPages.map((p, i) => {
                const isLast = i === filteredPages.length - 1;
                return (
                  <tr key={p.pagePath} className="hover:bg-stone/5 transition-colors">
                    <td className={`py-3 px-3 max-w-[340px] ${!isLast ? "border-b border-stone" : ""}`}>
                      <div className="font-semibold text-[13px] text-ink truncate" title={p.pageTitle}>
                        {p.pageTitle}
                      </div>
                      <div className="text-[11.5px] text-ink-soft truncate font-mono mt-0.5">
                        {p.pagePath}
                      </div>
                    </td>
                    <td className={`py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                      {p.brand ? (
                        <span
                          className={`inline-block text-[10px] font-bold py-0.5 px-2 rounded-sm ${getBrandTagClass(
                            p.brand
                          )}`}
                        >
                          {p.brand}
                        </span>
                      ) : (
                        <span className="text-[12px] text-stone-dark">—</span>
                      )}
                    </td>
                    <td className={`text-[13px] font-semibold py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                      {p.views.toLocaleString()}
                    </td>
                    <td className={`text-[13px] py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                      {formatDuration(p.avgTimeSec)}
                    </td>
                    <td className={`py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className="w-10 text-[12px] font-semibold">{p.avgScrollPct}%</span>
                        <div className="w-20 h-1.5 bg-stone rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-amber"
                            style={{ width: `${p.avgScrollPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className={`py-3 px-3 ${!isLast ? "border-b border-stone" : ""}`}>
                      <span
                        className={`inline-block text-[11.5px] font-semibold py-0.5 px-2 rounded-sm ${getBounceClass(
                          p.bounceRate
                        )}`}
                      >
                        {p.bounceRate}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPagesCount > 15 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone">
            <div className="text-[12.5px] text-ink-soft">
              Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, totalPagesCount)} of{" "}
              {totalPagesCount} pages
            </div>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`/analytics?days=${days}&brand=${brand}&page=${page - 1}${
                    searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""
                  }`}
                  className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] hover:bg-stone"
                >
                  Previous
                </Link>
              ) : (
                <span className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] text-stone-dark cursor-not-allowed">
                  Previous
                </span>
              )}

              {page * 15 < totalPagesCount ? (
                <Link
                  href={`/analytics?days=${days}&brand=${brand}&page=${page + 1}${
                    searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""
                  }`}
                  className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] hover:bg-stone"
                >
                  Next
                </Link>
              ) : (
                <span className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] text-stone-dark cursor-not-allowed">
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
