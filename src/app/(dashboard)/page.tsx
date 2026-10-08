import { getDashboardRecommendations, getOverviewStats } from "@/lib/services";
import prisma from "@/lib/prisma";

export default function OverviewPage() {
  return (
    <OverviewContent />
  );
}

async function OverviewContent() {
  const recommendations = await getDashboardRecommendations();
  const stats = await getOverviewStats();
  
  const currentMonthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  
  const formatSpend = (spend: number) => {
    if (spend >= 100000) return `₹${(spend / 100000).toFixed(1)}L`;
    if (spend >= 1000) return `₹${(spend / 1000).toFixed(1)}k`;
    return `₹${Math.round(spend)}`;
  };

  const brands = await prisma.brand.findMany();
  const brandMap = new Map(brands.map(b => [b.id, b]));

  const adSets = await prisma.adSet.findMany({
    where: { id: { in: recommendations.map(r => r.adSetId) } },
    include: { campaign: true }
  });
  const adSetMap = new Map(adSets.map(a => [a.id, a]));
  
  const metricsAgg = await prisma.dailyMetric.groupBy({
    by: ['adSetId'],
    _sum: { spend: true }
  });
  const spendMap = new Map(metricsAgg.map(m => [m.adSetId, Number(m._sum.spend || 0)]));

  const getBrandTagClass = (brandName: string) => {
    if (brandName === "Gardena") return "bg-green text-white";
    if (brandName === "BKR") return "bg-amber text-white";
    if (brandName === "Gorilla") return "bg-slate text-white";
    if (brandName === "Velcro") return "bg-rust text-white";
    return "bg-stone-dark text-white";
  };
  
  const getRecClass = (action: string) => {
    if (action === "INCREASE") return "bg-green-tint text-green";
    if (action === "DECREASE") return "bg-rust-tint text-rust";
    if (action === "MIXED_SEASON_REVIEW") return "bg-amber-tint text-amber";
    if (action === "NOT_RATED") return "bg-stone text-ink-soft";
    return "bg-slate-tint text-slate";
  };
  
  const getRecLabel = (action: string) => {
    if (action === "INCREASE") return "Increase budget";
    if (action === "DECREASE") return "Reduce budget";
    if (action === "HOLD_SEASONAL") return "Hold, seasonal";
    if (action === "MIXED_SEASON_REVIEW") return "Mixed season review";
    if (action === "NOT_RATED") return "Not rated";
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

      <div className="card-base p-7 mb-[1px]">
        <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">Recommendations this cycle</h3>
        <div className="text-[12.5px] text-ink-soft mb-[18px]">
          Generated from tagged leads + spend, ranked by cost per genuine lead
        </div>
        
        {recommendations.length === 0 ? (
          <div className="text-[13.5px] text-ink-soft py-4">No active ad sets found.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Brand</th>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Ad set</th>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Cost / genuine lead</th>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Spend</th>
                <th className="text-left text-[11.5px] text-ink-soft font-semibold py-2.5 px-2.5 border-b border-stone">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec, i) => {
                const brand = brandMap.get(rec.brandId);
                const adSet = adSetMap.get(rec.adSetId);
                const spend = spendMap.get(rec.adSetId) || 0;
                const isLast = i === recommendations.length - 1;
                
                return (
                  <tr key={rec.adSetId}>
                    <td className={`text-[13.5px] py-3 px-2.5 ${!isLast ? 'border-b border-stone' : ''}`}>
                      <span className={`inline-block text-[10.5px] font-bold py-1 px-2.5 rounded-sm ${getBrandTagClass(brand?.name || "")}`}>
                        {brand?.name || "Unknown"}
                      </span>
                    </td>
                    <td className={`text-[13.5px] py-3 px-2.5 ${!isLast ? 'border-b border-stone' : ''}`}>
                      {adSet?.campaign?.products?.length ? `${adSet.campaign.products.join(', ')} — ` : ''}{adSet?.name || "Unknown"}
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
        )}
      </div>
    </div>
  );
}
