import { getDashboardRecommendations, getOverviewStats } from "@/lib/services";
import { getWebsiteAnalyticsData, formatDuration } from "@/lib/analyticsService";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OverviewPage({ searchParams }: { searchParams: { page?: string, filter?: string } }) {
  return (
    <OverviewContent searchParams={searchParams} />
  );
}

async function OverviewContent({ searchParams }: { searchParams: { page?: string, filter?: string } }) {
  const session = await getSession();
  if (session?.role === "LEAD_TAGGER") {
    redirect("/leads");
  }

  const [recommendationsRaw, stats, { overview: webOverview }, brands] = await Promise.all([
    getDashboardRecommendations(),
    getOverviewStats(),
    getWebsiteAnalyticsData({ days: 30 }),
    prisma.brand.findMany()
  ]);

  const filter = searchParams.filter;
  const recommendations = filter && filter !== "ALL" 
    ? recommendationsRaw.filter((r: any) => r.action === filter)
    : recommendationsRaw;

  const currentMonthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  
  const formatSpend = (spend: number) => {
    if (spend >= 100000) return `₹${(spend / 100000).toFixed(1)}L`;
    if (spend >= 1000) return `₹${(spend / 1000).toFixed(1)}k`;
    return `₹${Math.round(spend)}`;
  };

  const brandMap = new Map(brands.map(b => [b.id, b]));
  
  const page = parseInt(searchParams.page || "1", 10);
  const pageSize = 15;
  const totalPages = Math.ceil(recommendations.length / pageSize);
  const pagedRecommendations = recommendations.slice((page - 1) * pageSize, page * pageSize);
  const pagedAdSetIds = pagedRecommendations.map((r: any) => r.adSetId);

  const [adSets, metricsAgg] = await Promise.all([

    prisma.adSet.findMany({
      where: { id: { in: pagedAdSetIds } },
      include: { campaign: { include: { adConnection: true } } }
    }),
    prisma.dailyMetric.groupBy({
      by: ['adSetId'],
      where: { adSetId: { in: pagedAdSetIds } },
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
      <div className="flex justify-between items-end mb-8 border-b border-stone pb-5">
        <div>
          <h1 className="font-serif text-[30px] m-0 mb-1 font-semibold">Overview</h1>
          <p className="m-0 text-[13.5px] text-ink-soft">All brands, blended &middot; {currentMonthName}</p>
        </div>
        <div className="text-[12.5px] border border-stone px-4 py-2 text-ink-soft bg-card rounded-md">
          {stats.latestSync ? `Last synced: ${stats.latestSync.finishedAt?.toLocaleString()}` : 'Not synced yet'}
        </div>
      </div>

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
        <div className="flex justify-between items-start mb-[18px]">
          <div>
            <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">Recommendations this cycle</h3>
            <div className="text-[12.5px] text-ink-soft">
              Generated from tagged leads + spend, ranked by cost per genuine lead
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <Link href="?filter=ALL" className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border border-transparent ${!filter || filter === 'ALL' ? 'bg-ink text-white' : 'bg-stone text-ink-soft hover:bg-stone-dark hover:text-white'}`}>All</Link>
            <Link href="?filter=INCREASE" className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border ${filter === 'INCREASE' ? 'bg-green-tint text-green border-green/20' : 'bg-white border-stone text-ink-soft hover:bg-stone'}`}>Increase</Link>
            <Link href="?filter=DECREASE" className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border ${filter === 'DECREASE' ? 'bg-rust-tint text-rust border-rust/20' : 'bg-white border-stone text-ink-soft hover:bg-stone'}`}>Reduce</Link>
            <Link href="?filter=HOLD" className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border ${filter === 'HOLD' ? 'bg-slate-tint text-slate border-slate/20' : 'bg-white border-stone text-ink-soft hover:bg-stone'}`}>Hold</Link>
            <Link href="?filter=NOT_ENOUGH_DATA" className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border ${filter === 'NOT_ENOUGH_DATA' ? 'bg-stone text-ink-soft border-stone-dark/20' : 'bg-white border-stone text-ink-soft hover:bg-stone'}`}>Not enough data</Link>
          </div>
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
                      {adSet?.campaign?.products?.length ? `${adSet.campaign.products.join(', ')} — ` : ''}{adSet?.name || "Unknown"}
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
                  <Link href={`/?page=${page - 1}${filter ? `&filter=${filter}` : ''}`} className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] hover:bg-stone">Previous</Link>
                ) : (
                  <span className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] text-stone-dark cursor-not-allowed">Previous</span>
                )}
                
                {page < totalPages ? (
                  <Link href={`/?page=${page + 1}${filter ? `&filter=${filter}` : ''}`} className="px-3 py-1.5 border border-stone rounded-sm text-[12.5px] hover:bg-stone">Next</Link>
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
