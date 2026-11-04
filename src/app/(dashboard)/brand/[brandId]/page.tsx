import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import MonthSelector from "./MonthSelector";
import { resolveMetaCampaignBrand } from "@/lib/metaBasicMetrics";

export const dynamic = "force-dynamic";

// 60-second in-memory cache for instant brand page transitions
const brandReportCache = new Map<string, { data: any; expiresAt: number }>();

async function getBrandData(brandName: string, currentMonthStr: string): Promise<{
  currentBrand: any;
  isSeasonal: boolean;
  totalSpend: number;
  spendByRegion: Record<string, number>;
  spendByBrand: Record<string, number>;
  isHalteAll: boolean;
}> {
  const cleanBrandName = decodeURIComponent(brandName).replace(/%20/g, " ").trim();
  const cacheKey = `${cleanBrandName}_${currentMonthStr}`;
  const now = Date.now();
  const cached = brandReportCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const allBrands = await prisma.brand.findMany({
    select: { id: true, name: true, pageId: true, isSeasonal: true, colorToken: true }
  });
  const normalizedBrandName = cleanBrandName.toLowerCase();
  const isHalteAll = normalizedBrandName === "halte all" || normalizedBrandName === "all" || normalizedBrandName === "halte-all";
  const currentBrand = allBrands.find(b => b.name.toLowerCase() === (isHalteAll ? "halte all" : normalizedBrandName));
  const isSeasonal = currentBrand?.isSeasonal || false;

  const [year, month] = currentMonthStr.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  let totalSpend = 0;
  const spendByRegion: Record<string, number> = {};
  const spendByBrand: Record<string, number> = {};

  const agg = await prisma.dailyMetric.groupBy({
    by: ['adSetId'],
    where: { 
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    _sum: { spend: true }
  });

  const adSetIds = agg.map(a => a.adSetId);
  const adSets = await prisma.adSet.findMany({
    where: { id: { in: adSetIds } },
    select: {
      id: true,
      campaign: {
        select: {
          name: true,
          region: true,
          brandPageId: true,
          brand: { select: { name: true } }
        }
      }
    }
  });

  const brandPageMap = new Map(allBrands.map(b => [b.pageId, b.name]));
  const adSetLookup = new Map(adSets.map(a => [a.id, a]));

  for (const a of agg) {
    const s = Number(a._sum.spend || 0);
    const adset = adSetLookup.get(a.adSetId);
    const cName = adset?.campaign?.name || "";
    const explicitBrand = adset?.campaign?.brand?.name || (adset?.campaign?.brandPageId ? brandPageMap.get(adset.campaign.brandPageId) : null);
    const resolvedBrand = resolveMetaCampaignBrand(cName, explicitBrand);

    // If viewing a specific brand (e.g. Gardena, BKR), only include matching campaigns
    if (!isHalteAll && resolvedBrand.toLowerCase() !== normalizedBrandName) {
      continue;
    }

    totalSpend += s;
    const r = adset?.campaign?.region || "National / All India";
    spendByRegion[r] = (spendByRegion[r] || 0) + s;

    const bName = resolvedBrand === "Halte All" ? "Halte (Multi-Brand)" : resolvedBrand;
    spendByBrand[bName] = (spendByBrand[bName] || 0) + s;
  }

  const result = { currentBrand, isSeasonal, totalSpend, spendByRegion, spendByBrand, isHalteAll };
  brandReportCache.set(cacheKey, { data: result, expiresAt: now + 300000 }); // 5 min cache
  return result;
}

export default async function BrandReportPage({ 
  params,
  searchParams
}: { 
  params: { brandId: string },
  searchParams: { month?: string }
}) {
  const session = await getSession();
  if (session?.role === "LEAD_TAGGER") {
    redirect("/leads");
  }

  const rawBrand = params.brandId;
  const brandName = decodeURIComponent(rawBrand).replace(/%20/g, " ").trim();
  const currentMonthStr = searchParams.month || new Date().toISOString().substring(0, 7);
  const { currentBrand, isSeasonal, totalSpend, spendByRegion, spendByBrand, isHalteAll } = await getBrandData(brandName, currentMonthStr);

  const circumference = 2 * Math.PI * 62; // ~389.55
  const segments: any[] = [];
  let currentOffset = 0;
  const sortedRegions: [string, number][] = (Object.entries(spendByRegion) as [string, number][]).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  );
  
  const colorToken = currentBrand?.colorToken || "stone";
  const colors = [
    `var(--${colorToken})`, 
    `var(--${colorToken}-tint)`,
    "#D9B96A", 
    "#E7D8AE", 
    "#F0E4C6"
  ];

  for (let i = 0; i < sortedRegions.length; i++) {
    const [region, spend] = sortedRegions[i];
    const fraction = totalSpend > 0 ? spend / totalSpend : 0;
    const dashLength = fraction * circumference;
    
    segments.push({
      region,
      spend,
      percentage: Math.round(fraction * 100),
      dasharray: `${dashLength} ${circumference}`,
      dashoffset: -currentOffset,
      color: colors[i % colors.length]
    });
    
    currentOffset += dashLength;
  }

  // Spend by Brand donut segments for Halte All
  const brandSegments: any[] = [];
  let brandOffset = 0;
  const sortedBrands: [string, number][] = (Object.entries(spendByBrand) as [string, number][]).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  );

  const brandColorMap: Record<string, string> = {
    Gardena: "#15803d",
    BKR: "#d97706",
    Gorilla: "#475569",
    Velcro: "#b91c1c",
    "Halte (Multi-Brand)": "#1c1917",
    "Halte (Direct)": "#78716c"
  };

  for (let i = 0; i < sortedBrands.length; i++) {
    const [bName, spend] = sortedBrands[i];
    const fraction = totalSpend > 0 ? spend / totalSpend : 0;
    const dashLength = fraction * circumference;
    brandSegments.push({
      brand: bName,
      spend,
      percentage: Math.round(fraction * 100),
      dasharray: `${dashLength} ${circumference}`,
      dashoffset: -brandOffset,
      color: brandColorMap[bName] || colors[i % colors.length]
    });
    brandOffset += dashLength;
  }
  
  const getTabClass = (tabName: string) => {
    const isActive = isHalteAll 
      ? (tabName === "Halte All")
      : (tabName.toLowerCase() === brandName.toLowerCase());
    const base = "text-[13px] font-semibold py-[9px] px-[18px] border border-stone cursor-pointer transition-colors rounded-sm";
    
    if (!isActive) return `${base} bg-card text-ink-soft hover:bg-stone/20`;
    
    if (tabName === "Gardena") return `${base} bg-green border-green text-white`;
    if (tabName === "BKR") return `${base} bg-amber border-amber text-white`;
    if (tabName === "Gorilla") return `${base} bg-slate border-slate text-white`;
    if (tabName === "Velcro") return `${base} bg-rust border-rust text-white`;
    if (tabName === "Halte All") return `${base} bg-ink border-ink text-white`;
    
    return base;
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-8 border-b border-stone pb-5">
        <div>
          <h1 className="font-serif text-[30px] m-0 mb-1 font-semibold">Brand Report</h1>
          <p className="m-0 text-[13.5px] text-ink-soft">Season and region view</p>
        </div>
        <MonthSelector currentMonth={currentMonthStr} brandId={isHalteAll ? "Halte All" : brandName} />
      </div>

      <div className="flex flex-wrap gap-2.5 mb-7">
        <Link href={`/brand/Gardena?month=${currentMonthStr}`} className={getTabClass("Gardena")}>Gardena</Link>
        <Link href={`/brand/BKR?month=${currentMonthStr}`} className={getTabClass("BKR")}>BKR</Link>
        <Link href={`/brand/Gorilla?month=${currentMonthStr}`} className={getTabClass("Gorilla")}>Gorilla</Link>
        <Link href={`/brand/Velcro?month=${currentMonthStr}`} className={getTabClass("Velcro")}>Velcro</Link>
        <Link href={`/brand/Halte All?month=${currentMonthStr}`} className={getTabClass("Halte All")}>Halte All</Link>
      </div>


      {isSeasonal && (
        <div className="flex gap-4 items-start bg-amber-tint border border-[#e3d3a8] p-5 mb-[1px] rounded-t-md">
          <div className="w-9 h-9 bg-amber shrink-0 rounded-sm"></div>
          <div>
            <b className="text-[14px]">Seasonal note</b>
            <p className="m-0 mt-1 text-[13px] text-ink-soft">
              This brand has seasonal rules applied. Budget allocations are heavily weighted towards regions where the season is active.
            </p>
          </div>
        </div>
      )}

      <div className={`grid ${isHalteAll ? "grid-cols-1 md:grid-cols-3" : "grid-cols-[1.4fr_1fr]"} gap-[1px] bg-stone border border-stone mb-[1px] rounded-b-md overflow-hidden`}>
        <div className="bg-card p-7">
          <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">
            {isHalteAll ? "Combined Brand Spend" : "Brand Spend"}
          </h3>
          <div className="text-[12.5px] text-ink-soft mb-[18px]">
            {isHalteAll ? "All brands combined this cycle" : "Total spend this cycle"}
          </div>
          <div className="font-serif text-[32px] font-semibold text-ink">
            ₹{totalSpend.toLocaleString()}
          </div>
          {isHalteAll && (
            <div className="mt-4 pt-3 border-t border-stone/50 space-y-1.5 text-[11.5px]">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-stone-dark mb-1">Top Brand Spends:</div>
              {sortedBrands.slice(0, 5).map(([b, amt]) => (
                <div key={b} className="flex justify-between items-center text-ink-soft">
                  <span className="font-medium">{b}</span>
                  <span className="font-mono text-ink">₹{Math.round(amt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isHalteAll && (
          <div className="bg-card p-7">
            <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">Spend by Brand</h3>
            <div className="text-[12.5px] text-ink-soft mb-[18px]">Share of total Halte spend</div>
            <svg viewBox="0 0 180 180" width="100%" height="150">
              <circle cx="90" cy="90" r="62" fill="none" stroke="var(--stone)" strokeWidth="24"/>
              {brandSegments.map((seg) => (
                <circle 
                  key={seg.brand}
                  cx="90" cy="90" r="62" 
                  fill="none" 
                  stroke={seg.color} 
                  strokeWidth="24" 
                  strokeDasharray={seg.dasharray} 
                  strokeDashoffset={seg.dashoffset} 
                  transform="rotate(-90 90 90)"
                />
              ))}
              <text x="90" y="86" textAnchor="middle" fontFamily="var(--font-newsreader)" fontSize="20" fill="var(--ink)">
                {brandSegments.length > 0 ? `${brandSegments[0].percentage}%` : "0%"}
              </text>
              <text x="90" y="104" textAnchor="middle" fontFamily="var(--font-inter)" fontSize="10" fill="var(--stone-dark)">
                {brandSegments.length > 0 ? brandSegments[0].brand : "No data"}
              </text>
            </svg>
            
            <div className="mt-2 text-[11px] text-ink-soft flex flex-wrap gap-x-3 gap-y-1 justify-center">
              {brandSegments.map(seg => (
                <div key={seg.brand} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: seg.color }}></span>
                  {seg.brand} ({seg.percentage}%)
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card p-7">
          <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">Spend by region</h3>
          <div className="text-[12.5px] text-ink-soft mb-[18px]">
            {isHalteAll ? "Share of total Halte spend" : `Share of ${brandName} spend`}
          </div>
          <svg viewBox="0 0 180 180" width="100%" height="150">
            <circle cx="90" cy="90" r="62" fill="none" stroke="var(--stone)" strokeWidth="24"/>
            {segments.map((seg) => (
              <circle 
                key={seg.region}
                cx="90" cy="90" r="62" 
                fill="none" 
                stroke={seg.color} 
                strokeWidth="24" 
                strokeDasharray={seg.dasharray} 
                strokeDashoffset={seg.dashoffset} 
                transform="rotate(-90 90 90)"
              />
            ))}
            <text x="90" y="86" textAnchor="middle" fontFamily="var(--font-newsreader)" fontSize="22" fill="var(--ink)">
              {segments.length > 0 ? `${segments[0].percentage}%` : "0%"}
            </text>
            <text x="90" y="104" textAnchor="middle" fontFamily="var(--font-inter)" fontSize="10" fill="var(--stone-dark)">
              {segments.length > 0 ? segments[0].region : "No data"}
            </text>
          </svg>
          
          <div className="mt-2 text-[11px] text-ink-soft flex flex-wrap gap-x-3 gap-y-1 justify-center">
            {segments.map(seg => (
              <div key={seg.region} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: seg.color }}></span>
                {seg.region} ({seg.percentage}%)
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
