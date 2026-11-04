import { getDashboardRecommendations, getOverviewStats, getSyncTimelineOverview } from "@/lib/services";
import { getWebsiteAnalyticsSummary, formatDuration } from "@/lib/analyticsService";
import { getMetaOverviewMetrics } from "@/lib/metaBasicMetrics";
import { getGoogleOverviewMetrics } from "@/lib/googleMetrics";
import { getAmazonOverviewMetrics } from "@/lib/amazonMetrics";
import { MetaBasicMetricsOverview } from "@/components/MetaBasicMetricsOverview";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { SyncTimelineBadge } from "@/components/SyncTimelineBadge";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OverviewPage({
  searchParams
}: {
  searchParams: { page?: string; filter?: string; range?: string; platform?: string; from?: string; to?: string; q?: string; category?: string }
}) {
  return (
    <OverviewContent searchParams={searchParams} />
  );
}

async function OverviewContent({
  searchParams
}: {
  searchParams: { page?: string; filter?: string; range?: string; platform?: string; from?: string; to?: string; q?: string; category?: string }
}) {
  const session = await getSession();
  if (session?.role === "LEAD_TAGGER") {
    redirect("/leads");
  }

  const range = (searchParams.range === "7d" || searchParams.range === "90d" || searchParams.range === "all" || searchParams.range === "custom")
    ? searchParams.range
    : "30d";
  const from = searchParams.from;
  const to = searchParams.to;
  const selectedPlatformFilter = searchParams.platform || "ALL";
  const filter = searchParams.filter;

  const customRange = (range === "custom")
    ? {
        from: from
          ? new Date(from.includes("T") ? from : `${from}T00:00:00.000Z`)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to
          ? new Date(to.includes("T") ? to : `${to}T23:59:59.999Z`)
          : new Date(new Date().setHours(23, 59, 59, 999))
      }
    : undefined;

  const [recommendationsRaw, stats, webOverview, brands, metaBasicMetrics, googleBasicMetrics, amazonBasicMetrics, syncTimeline] = await Promise.all([
    getDashboardRecommendations(range, customRange),
    getOverviewStats(range, customRange),
    getWebsiteAnalyticsSummary(
      customRange
        ? { from: customRange.from, to: customRange.to }
        : { days: range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 180 : 30 }
    ),
    prisma.brand.findMany(),
    getMetaOverviewMetrics(customRange),
    getGoogleOverviewMetrics(customRange),
    getAmazonOverviewMetrics(customRange),
    getSyncTimelineOverview()
  ]);

  // Platform Counts for tabs
  const platformCounts = {
    ALL: recommendationsRaw.length,
    META: recommendationsRaw.filter((r: any) => r.platform === "META").length,
    GOOGLE: recommendationsRaw.filter((r: any) => r.platform === "GOOGLE").length,
    AMAZON: recommendationsRaw.filter((r: any) => r.platform === "AMAZON").length,
  };

  const brandMap = new Map(brands.map(b => [b.id, b]));
  const q = searchParams.q ? searchParams.q.trim().toLowerCase() : "";
  const category = searchParams.category;

  // Filter recommendations by platform, action, festive category, and search query
  let recommendations = recommendationsRaw;
  if (selectedPlatformFilter !== "ALL") {
    recommendations = recommendations.filter((r: any) => r.platform === selectedPlatformFilter);
  }
  if (filter && filter !== "ALL") {
    recommendations = recommendations.filter((r: any) => r.action === filter);
  }
  if (category === "FESTIVE") {
    const festiveRegex = /festiv|diwali|offer|deal|sale|navratri|christmas|rakhi/i;
    recommendations = recommendations.filter((r: any) => {
      const text = `${r.campaignName || ""} ${r.adSetName || ""} ${(r.products || []).join(" ")}`;
      return festiveRegex.test(text);
    });
  }
  if (q) {
    recommendations = recommendations.filter((r: any) => {
      const brand = brandMap.get(r.brandId)?.name || "";
      const text = `${brand} ${r.campaignName || ""} ${r.adSetName || ""} ${(r.products || []).join(" ")}`.toLowerCase();
      return text.includes(q);
    });
  }

  const buildRecsUrl = (updates: {
    platform?: string | null;
    filter?: string | null;
    category?: string | null;
    q?: string | null;
    page?: string | null;
  }) => {
    const params = new URLSearchParams();
    if (range === "custom" && from) {
      params.set("range", "custom");
      params.set("from", from);
      if (to) params.set("to", to);
    } else {
      params.set("range", range);
    }

    const nextPlatform = updates.platform !== undefined ? updates.platform : selectedPlatformFilter;
    if (nextPlatform && nextPlatform !== "ALL") params.set("platform", nextPlatform);

    const nextFilter = updates.filter !== undefined ? updates.filter : filter;
    if (nextFilter && nextFilter !== "ALL") params.set("filter", nextFilter);

    const nextCategory = updates.category !== undefined ? updates.category : category;
    if (nextCategory) params.set("category", nextCategory);

    const nextQ = updates.q !== undefined ? updates.q : (searchParams.q || null);
    if (nextQ) params.set("q", nextQ);

    const nextPage = updates.page !== undefined ? updates.page : null;
    if (nextPage && nextPage !== "1") params.set("page", nextPage);

    return `?${params.toString()}`;
  };

  const rangeQuery = range === "custom" && from
    ? `range=custom&from=${encodeURIComponent(from)}${to ? `&to=${encodeURIComponent(to)}` : ""}`
    : `range=${range}`;

  const currentMonthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  
  const formatSpend = (spend: number) => {
    if (spend >= 100000) return `₹${(spend / 100000).toFixed(1)}L`;
    if (spend >= 1000) return `₹${(spend / 1000).toFixed(1)}k`;
    return `₹${Math.round(spend)}`;
  };
  
  const page = parseInt(searchParams.page || "1", 10);
  const pageSize = 15;
  const totalPages = Math.ceil(recommendations.length / pageSize);
  const pagedRecommendations = recommendations.slice((page - 1) * pageSize, page * pageSize);
  const pagedAdSetIds = pagedRecommendations.map((r: any) => r.adSetId);

  const cutoff = customRange?.from 
    ? customRange.from 
    : range === "7d" 
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : range === "90d"
    ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    : range === "all"
    ? new Date("2020-01-01T00:00:00.000Z")
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const endCutoff = customRange?.to || new Date();

  const [adSets, metricsAgg] = await Promise.all([
    prisma.adSet.findMany({
      where: { id: { in: pagedAdSetIds } },
      include: { campaign: { include: { adConnection: true } } }
    }),
    prisma.dailyMetric.groupBy({
      by: ['adSetId'],
      where: {
        adSetId: { in: pagedAdSetIds },
        ...(range === "all" ? {} : { date: { gte: cutoff, lte: endCutoff } })
      },
      _sum: { spend: true }
    })
  ]);

  const adSetMap = new Map(adSets.map(a => [a.id, a]));
  const spendMap = new Map(metricsAgg.map(m => [m.adSetId, Number(m._sum.spend || 0)]));


  const getBrandTagClass = (brandName: string) => {
    if (brandName === "Gardena") return "bg-green text-white";
    if (brandName === "BKR") return "bg-amber text-white";
    if (brandName === "Gorilla") return "bg-slate text-white";
    if (brandName === "Velcro") return "bg-rust text-white";
    return "bg-stone-dark text-white";
  };
  
  const getPlatformTagClass = (platform: string) => {
    if (platform === "GOOGLE") return "bg-[#FCE8E6] text-[#EA4335]";
    if (platform === "AMAZON") return "bg-[#FEF5E6] text-[#FF9900]";
    return "bg-[#E7F0FF] text-[#1877F2]";
  };
  
  const getRecClass = (action: string) => {
    if (action === "INCREASE") return "bg-green-tint text-green";
    if (action === "DECREASE") return "bg-rust-tint text-rust";
    if (action === "MIXED_SEASON_REVIEW") return "bg-amber-tint text-amber";
    if (action === "NOT_RATED") return "bg-stone text-ink-soft";
    if (action === "NOT_ENOUGH_DATA") return "bg-stone text-ink-soft";
    return "bg-slate-tint text-slate";
  };
  
  const getRecLabel = (action: string) => {
    if (action === "INCREASE") return "Increase budget";
    if (action === "DECREASE") return "Reduce budget";
    if (action === "HOLD_SEASONAL") return "Hold, seasonal";
    if (action === "MIXED_SEASON_REVIEW") return "Mixed season review";
    if (action === "NOT_RATED") return "Not rated";
    if (action === "NOT_ENOUGH_DATA") return "Not enough data";
    return "Hold";
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-end mb-8 border-b border-stone pb-5 gap-4">
        <div>
          <h1 className="font-serif text-[30px] m-0 mb-1 font-semibold">Overview</h1>
          <p className="m-0 text-[13.5px] text-ink-soft">
            Omnichannel Marketing Intelligence &middot; {
              range === "all"
                ? "All Time"
                : range === "90d"
                ? "Past 90 Days"
                : range === "7d"
                ? "Past 7 Days"
                : range === "custom" && from
                ? `Custom Range (${from}${to ? ` to ${to}` : ""})`
                : "Past 30 Days"
            }
          </p>
        </div>

        {/* Global Date Range Selector & Sync Timeline Status */}
        <div className="flex items-center gap-3">
          <DateRangeSelector
            currentRange={range}
            from={from}
            to={to}
            currentPlatform={selectedPlatformFilter}
            currentFilter={filter}
          />

          <SyncTimelineBadge
            timeline={syncTimeline}
            activePlatform={selectedPlatformFilter}
          />
        </div>
      </div>

      {/* Basic Metrics Overview (Starting with Meta Reach, Impressions, Clicks, Spend & State/City Filtering) */}
      <MetaBasicMetricsOverview 
        data={metaBasicMetrics} 
        googleData={googleBasicMetrics} 
        amazonData={amazonBasicMetrics} 
        initialTimeRange={range}
        initialPlatform={selectedPlatformFilter === "GOOGLE" ? "GOOGLE" : selectedPlatformFilter === "AMAZON" ? "AMAZON" : "META"}
        syncTimeline={syncTimeline}
      />

      <div className="grid grid-cols-5 gap-[1px] bg-stone border border-stone mb-7 rounded-md overflow-hidden">

        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-ink"></div>
          <div className="font-serif text-[26px] font-semibold">{formatSpend(stats.messagingSpend)}</div>
          <div className="text-[12.5px] text-ink-soft mt-1">Messaging spend</div>
          {stats.latestSync && <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">Live data</div>}
        </div>
        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-slate"></div>
          <div className="font-serif text-[26px] font-semibold">{formatSpend(stats.otherSpend)}</div>
          <div className="text-[12.5px] text-ink-soft mt-1">Click and awareness spend</div>
          {stats.latestSync && <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">Live data</div>}
        </div>
        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-green"></div>
          <div className="font-serif text-[26px] font-semibold">{stats.genuineLeadsCount}</div>
          <div className="text-[12.5px] text-ink-soft mt-1">Genuine leads</div>
          {stats.otherGenuineLeadsCount > 0 && (
            <div className="text-[10px] text-ink-soft mt-1 leading-tight">
              +{stats.otherGenuineLeadsCount} not linked to a messaging ad set
            </div>
          )}
          {stats.latestSync && <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">Live data</div>}
        </div>
        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-amber"></div>
          <div className="font-serif text-[26px] font-semibold">₹{stats.cpgl}</div>
          <div className="text-[12.5px] text-ink-soft mt-1">Cost per genuine lead</div>
          {stats.latestSync && <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">Live data</div>}
        </div>
        <div className="bg-card p-6">
          <div className="h-[2px] w-[30px] mb-4 bg-rust"></div>
          <div className="font-serif text-[26px] font-semibold">{stats.spamRate}%</div>
          <div className="text-[12.5px] text-ink-soft mt-1">Leads flagged spam</div>
          {stats.latestSync && <div className="text-[11.5px] mt-2.5 font-semibold text-stone-dark">Live data</div>}
        </div>
      </div>

      {/* Website Telemetry & Behavior Pulse Strip */}
      <div className="card-base p-6 mb-7 flex flex-wrap justify-between items-center gap-4 bg-card border-stone">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-green">Halte.in Website Pulse</span>
          </div>
          <h3 className="text-[15px] font-bold font-sans m-0">Traffic, Bounce &amp; Scroll Behavior</h3>
          <p className="text-[12.5px] text-ink-soft m-0 mt-0.5">
            {webOverview.totalSessions.toLocaleString()} sessions &middot; {webOverview.totalPageviews.toLocaleString()} pageviews across all brands
          </p>
        </div>

        <div className="flex gap-6 items-center">
          <div>
            <div className="font-serif text-[20px] font-semibold text-ink">{webOverview.bounceRate}%</div>
            <div className="text-[11.5px] text-ink-soft">Bounce rate</div>
          </div>
          <div className="h-8 w-[1px] bg-stone"></div>
          <div>
            <div className="font-serif text-[20px] font-semibold text-ink">{formatDuration(webOverview.avgSessionDurationSec)}</div>
            <div className="text-[11.5px] text-ink-soft">Avg. time spent</div>
          </div>
          <div className="h-8 w-[1px] bg-stone"></div>
          <div>
            <div className="font-serif text-[20px] font-semibold text-ink">{webOverview.avgScrollDepthPct}%</div>
            <div className="text-[11.5px] text-ink-soft">Avg. scroll depth</div>
          </div>
          <div className="h-8 w-[1px] bg-stone"></div>
          <div>
            <div className="font-serif text-[20px] font-semibold text-ink">{webOverview.pagesPerSession}</div>
            <div className="text-[11.5px] text-ink-soft">Pages / session</div>
          </div>

          <Link
            href="/analytics"
            className="ml-2 bg-ink text-white py-2 px-4 rounded-sm text-[12px] font-semibold hover:bg-gold transition-colors"
          >
            Deep Dive &rarr;
          </Link>
        </div>
      </div>

      <div className="card-base p-7 mb-[1px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 pb-4 border-b border-stone/50">
          <div>
            <h3 className="m-0 mb-1 text-[16px] font-bold font-sans flex items-center gap-2">
              <span>Algorithmic Recommendations</span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-stone/30 text-stone-dark">
                {range === "all" ? "All Time" : range === "90d" ? "Past 90 Days" : range === "7d" ? "Past 7 Days" : range === "custom" && from ? `Custom (${from}${to ? ` to ${to}` : ""})` : "Past 30 Days"}
              </span>
            </h3>
            <div className="text-[12.5px] text-ink-soft">
              AI budget and scaling guidance ranked by Cost per Genuine Lead &amp; ROAS across platforms
            </div>
          </div>

          {/* Action Filter Pills & Festive Filter */}
          <div className="flex gap-1.5 items-center flex-wrap">
            <Link href={buildRecsUrl({ filter: 'ALL', page: '1' })} className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border border-transparent ${!filter || filter === 'ALL' ? 'bg-ink text-white' : 'bg-stone text-ink-soft hover:bg-stone-dark hover:text-white'}`}>All Actions</Link>
            <Link href={buildRecsUrl({ filter: 'INCREASE', page: '1' })} className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border ${filter === 'INCREASE' ? 'bg-green-tint text-green border-green/20' : 'bg-white border-stone text-ink-soft hover:bg-stone'}`}>Increase</Link>
            <Link href={buildRecsUrl({ filter: 'DECREASE', page: '1' })} className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border ${filter === 'DECREASE' ? 'bg-rust-tint text-rust border-rust/20' : 'bg-white border-stone text-ink-soft hover:bg-stone'}`}>Reduce</Link>
            <Link href={buildRecsUrl({ filter: 'HOLD', page: '1' })} className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border ${filter === 'HOLD' ? 'bg-slate-tint text-slate border-slate/20' : 'bg-white border-stone text-ink-soft hover:bg-stone'}`}>Hold</Link>
            <Link href={buildRecsUrl({ filter: 'NOT_ENOUGH_DATA', page: '1' })} className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border ${filter === 'NOT_ENOUGH_DATA' ? 'bg-stone text-ink-soft border-stone-dark/20' : 'bg-white border-stone text-ink-soft hover:bg-stone'}`}>Not enough data</Link>
          </div>
        </div>

        {/* Platform Filter Tabs, Festive Chip, & Search Input for Recommendations */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-1">
          <div className="flex items-center gap-2 overflow-x-auto text-[12px]">
            <span className="font-semibold text-ink-soft text-[11.5px] mr-1">Platform:</span>
            <Link
              href={buildRecsUrl({ platform: 'ALL', page: '1' })}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                selectedPlatformFilter === "ALL"
                  ? "bg-ink text-white shadow-2xs"
                  : "bg-card text-ink-soft border border-stone hover:border-slate/40"
              }`}
            >
              All Platforms ({platformCounts.ALL})
            </Link>
            <Link
              href={buildRecsUrl({ platform: 'META', page: '1' })}
              className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-colors ${
                selectedPlatformFilter === "META"
                  ? "bg-[#1877F2] text-white shadow-2xs"
                  : "bg-card text-ink-soft border border-stone hover:border-[#1877F2]/40"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2]"></span>
              Meta Ads ({platformCounts.META})
            </Link>
            <Link
              href={buildRecsUrl({ platform: 'GOOGLE', page: '1' })}
              className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-colors ${
                selectedPlatformFilter === "GOOGLE"
                  ? "bg-[#EA4335] text-white shadow-2xs"
                  : "bg-card text-ink-soft border border-stone hover:border-[#EA4335]/40"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]"></span>
              Google Ads ({platformCounts.GOOGLE})
            </Link>
            <Link
              href={buildRecsUrl({ platform: 'AMAZON', page: '1' })}
              className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-colors ${
                selectedPlatformFilter === "AMAZON"
                  ? "bg-[#FF9900] text-white shadow-2xs"
                  : "bg-card text-ink-soft border border-stone hover:border-[#FF9900]/40"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]"></span>
              Amazon Ads ({platformCounts.AMAZON})
            </Link>

            <span className="text-stone mx-1">|</span>

            {/* Festive Campaign Filter Chip */}
            <Link
              href={buildRecsUrl({ category: category === 'FESTIVE' ? null : 'FESTIVE', page: '1' })}
              className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-all ${
                category === "FESTIVE"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-card text-ink-soft border border-stone hover:border-amber-500 hover:text-amber-800"
              }`}
            >
              <span>🎉 Festive &amp; Offers</span>
              {category === "FESTIVE" && <span className="text-[10px] bg-white/20 px-1 rounded">Active</span>}
            </Link>
          </div>

          {/* Search Box */}
          <form method="GET" action="/" className="relative flex items-center">
            <input type="hidden" name="range" value={range} />
            {range === "custom" && from && <input type="hidden" name="from" value={from} />}
            {range === "custom" && to && <input type="hidden" name="to" value={to} />}
            {selectedPlatformFilter !== "ALL" && <input type="hidden" name="platform" value={selectedPlatformFilter} />}
            {filter && filter !== "ALL" && <input type="hidden" name="filter" value={filter} />}
            {category && <input type="hidden" name="category" value={category} />}
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q || ""}
              placeholder="Search campaigns, ad sets, brands..."
              className="text-[11.5px] pl-3 pr-7 py-1 bg-card border border-stone rounded outline-none focus:border-slate w-56 transition-colors"
            />
            {searchParams.q && (
              <Link
                href={buildRecsUrl({ q: null, page: '1' })}
                className="absolute right-2 text-ink-soft hover:text-ink text-[11px] font-bold"
                title="Clear search"
              >
                ✕
              </Link>
            )}
          </form>
        </div>
        
        {recommendations.length === 0 ? (
          <div className="text-[13.5px] text-ink-soft py-4">No active ad sets found.</div>
        ) : (
          <>
            <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Brand</th>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Ad set</th>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Source</th>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Cost / genuine lead</th>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Spend</th>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {pagedRecommendations.map((rec: any, i: number) => {
                const brand = brandMap.get(rec.brandId);

                const adSet = adSetMap.get(rec.adSetId);
                const spend = spendMap.get(rec.adSetId) || 0;
                const isLast = i === pagedRecommendations.length - 1;
                
                return (
                  <tr key={rec.adSetId}>
                    <td className={`text-[13.5px] py-3 px-2.5 ${!isLast ? 'border-b border-stone' : ''}`}>
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`inline-block text-[10.5px] font-bold py-1 px-2.5 rounded-sm ${getBrandTagClass(brand?.name || "")}`}>
                          {brand?.name || "Unknown"}
                        </span>
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider py-0.5 px-1.5 rounded-sm ${getPlatformTagClass(adSet?.campaign?.adConnection?.platform || "META")}`}>
                          {adSet?.campaign?.adConnection?.platform === "GOOGLE" ? "Google Ad" : adSet?.campaign?.adConnection?.platform === "AMAZON" ? "Amazon Ad" : "Meta Ad"}
                        </span>
                      </div>
                    </td>
                    <td className={`text-[13.5px] py-3 px-2.5 ${!isLast ? 'border-b border-stone' : ''}`}>
                      <div className="flex flex-col gap-0.5 items-start">
                        <span className="font-semibold text-ink leading-tight">
                          {adSet?.campaign?.name || rec.campaignName || "Campaign"}
                        </span>
                        <span className="text-[12px] text-ink-soft">
                          {adSet?.name || rec.adSetName || "Ad Set"}
                          {adSet?.campaign?.products?.length ? ` · ${adSet.campaign.products.join(', ')}` : ''}
                        </span>
                        {/festiv|diwali|offer|deal|sale|navratri|christmas|rakhi/i.test(`${rec.campaignName || adSet?.campaign?.name || ""} ${rec.adSetName || adSet?.name || ""}`) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 mt-1">
                            <span>🎉</span> Festive / Deal Campaign
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`text-[12px] text-ink-soft py-3 px-2.5 ${!isLast ? 'border-b border-stone' : ''}`}>
                      {adSet?.campaign?.adConnection?.label || adSet?.campaign?.adConnection?.platformAccountId || "Unknown"}
                    </td>
                    <td className={`text-[13.5px] py-3 px-2.5 ${!isLast ? 'border-b border-stone' : ''}`}>
                      {rec.costPerGenuine === 0 ? "₹0" : `₹${Math.round(rec.costPerGenuine)}`}
                    </td>
                    <td className={`text-[13.5px] py-3 px-2.5 ${!isLast ? 'border-b border-stone' : ''}`}>
                      ₹{spend.toLocaleString()}
                    </td>
                    <td className={`text-[13.5px] py-3 px-2.5 ${!isLast ? 'border-b border-stone' : ''}`}>
                      <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold py-1 px-2.5 rounded-sm ${getRecClass(rec.action)}`} title={rec.reason}>
                        {getRecLabel(rec.action)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone">
              <div className="text-[12.5px] text-ink-soft">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, recommendations.length)} of {recommendations.length} recommendations
              </div>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={buildRecsUrl({ page: String(page - 1) })} className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] hover:bg-stone">Previous</Link>
                ) : (
                  <span className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] text-stone-dark cursor-not-allowed">Previous</span>
                )}
                
                {page < totalPages ? (
                  <Link href={buildRecsUrl({ page: String(page + 1) })} className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] hover:bg-stone">Next</Link>
                ) : (
                  <span className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] text-stone-dark cursor-not-allowed">Next</span>
                )}
              </div>
            </div>
          )}
        </>
        )}
      </div>
    </div>
  );
}
