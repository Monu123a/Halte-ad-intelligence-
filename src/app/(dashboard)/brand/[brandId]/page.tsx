import Link from "next/link";
import prisma from "@/lib/prisma";
import MonthSelector from "./MonthSelector";

export default async function BrandReportPage({ 
  params,
  searchParams
}: { 
  params: { brandId: string },
  searchParams: { month?: string }
}) {
  const brandName = params.brandId;
  
  const allBrands = await prisma.brand.findMany();
  const currentBrand = allBrands.find(b => b.name === brandName);
  
  const isSeasonal = currentBrand?.isSeasonal || false;
  
  // Parse month from searchParams (YYYY-MM), default to current month
  const currentMonthStr = searchParams.month || new Date().toISOString().substring(0, 7);
  const [year, month] = currentMonthStr.split("-").map(Number);
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  let totalSpend = 0;
  const spendByRegion: Record<string, number> = {};
  
  if (currentBrand) {
    const agg = await prisma.dailyMetric.groupBy({
      by: ['adSetId'],
      where: { 
        adSet: { campaign: { brandPageId: currentBrand.pageId } },
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
      include: { campaign: true }
    });

    const regionMap: Record<string, string> = {};
    for (const adSet of adSets) {
      regionMap[adSet.id] = adSet.campaign.region || "Unknown";
    }

    for (const a of agg) {
      const s = Number(a._sum.spend || 0);
      const r = regionMap[a.adSetId] || "Unknown";
      spendByRegion[r] = (spendByRegion[r] || 0) + s;
      totalSpend += s;
    }
  }

  const circumference = 2 * Math.PI * 62; // ~389.55
  const segments: any[] = [];
  let currentOffset = 0;
  const sortedRegions = Object.entries(spendByRegion).sort((a, b) => b[1] - a[1]);
  
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
  
  const getTabClass = (tabName: string) => {
    const isActive = tabName === brandName;
    const base = "text-[13px] font-semibold py-[9px] px-[18px] border border-stone cursor-pointer transition-colors rounded-sm";
    
    if (!isActive) return `${base} bg-card text-ink-soft hover:bg-stone/20`;
    
    if (tabName === "Gardena") return `${base} bg-green border-green text-white`;
    if (tabName === "BKR") return `${base} bg-amber border-amber text-white`;
    if (tabName === "Gorilla") return `${base} bg-slate border-slate text-white`;
    if (tabName === "Velcro") return `${base} bg-rust border-rust text-white`;
    
    return base;
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-8 border-b border-stone pb-5">
        <div>
          <h1 className="font-serif text-[30px] m-0 mb-1 font-semibold">Brand Report</h1>
          <p className="m-0 text-[13.5px] text-ink-soft">Season and region view</p>
        </div>
        <MonthSelector currentMonth={currentMonthStr} brandId={brandName} />
      </div>

      <div className="flex gap-2.5 mb-7">
        <Link href={`/brand/Gardena?month=${currentMonthStr}`} className={getTabClass("Gardena")}>Gardena</Link>
        <Link href={`/brand/BKR?month=${currentMonthStr}`} className={getTabClass("BKR")}>BKR</Link>
        <Link href={`/brand/Gorilla?month=${currentMonthStr}`} className={getTabClass("Gorilla")}>Gorilla</Link>
        <Link href={`/brand/Velcro?month=${currentMonthStr}`} className={getTabClass("Velcro")}>Velcro</Link>
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

      <div className="grid grid-cols-[1.4fr_1fr] gap-[1px] bg-stone border border-stone mb-[1px] rounded-b-md overflow-hidden">
        <div className="bg-card p-7">
          <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">Brand Spend</h3>
          <div className="text-[12.5px] text-ink-soft mb-[18px]">Total spend this cycle</div>
          <div className="font-serif text-[32px] font-semibold text-ink">
            ₹{totalSpend.toLocaleString()}
          </div>
        </div>
        <div className="bg-card p-7">
          <h3 className="m-0 mb-1 text-[15px] font-bold font-sans">Spend by region</h3>
          <div className="text-[12.5px] text-ink-soft mb-[18px]">Share of {brandName} spend</div>
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
