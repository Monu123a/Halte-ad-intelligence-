import prisma from "@/lib/prisma";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { UnmappedCampaigns } from "@/components/UnmappedCampaigns";

export default async function ConnectionsPage() {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";
  const connections = await prisma.adConnection.findMany();

  const unmapped = await prisma.campaign.findMany({
    where: { brandPageId: null }
  });
  
  const brands = await prisma.brand.findMany();
  // Quick hardcoded list of valid products from SeasonalRule
  const products = ["Snow Chains", "BBQ", "Garden Machinery", "Waterproof Tape", "Sprinklers", "Leaf Blowers", "Firepit", "Fogging Machine", "Gensets", "Chainsaw", "Lawn Mowers", "Brush Cutters", "Trimmers", "Pole Pruners", "Tillers", "Portable Sprayers", "Hose Reels", "Mounting Tape", "Cord Organiser", "Garden Pruners"];

  return (
    <div>
      <div className="flex justify-between items-end mb-8 border-b border-stone pb-5">
        <div>
          <h1 className="font-serif text-[30px] m-0 mb-1 font-semibold">Connections</h1>
          <p className="m-0 text-[13.5px] text-ink-soft">Meta Business Manager access, by ad account</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-[12.5px] border border-stone px-4 py-2 text-ink-soft bg-card rounded-md">
            Auto-sync: daily, 6:00 AM
          </div>
          {isAdmin && (
            <Link 
              href="/api/auth/meta/connect" 
              className="bg-ink text-white py-2 px-4 rounded-sm text-[12.5px] font-semibold hover:bg-ink/90 transition-colors"
            >
              Connect Meta
            </Link>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-[1px] bg-stone border border-stone rounded-md overflow-hidden">
        {connections.length === 0 && (
          <div className="bg-card p-6 col-span-2 text-ink-soft text-[13.5px]">
            No connections established yet.
          </div>
        )}
        {connections.map(async (conn) => {
          const count = await prisma.campaign.count({ where: { adConnectionId: conn.id } });
          const date12MonthsAgo = new Date();
          date12MonthsAgo.setMonth(date12MonthsAgo.getMonth() - 12);
          const metrics = await prisma.dailyMetric.aggregate({
            where: { 
              date: { gte: date12MonthsAgo },
              adSet: { campaign: { adConnectionId: conn.id } }
            },
            _sum: { spend: true }
          });
          const spend = Number(metrics._sum.spend || 0);
          
          let displayStatus = "Not connected yet";
          let dotColor = "bg-amber";
          
          if (conn.status === "CONNECTED") {
            if (conn.lastSyncedAt && count === 0) {
              displayStatus = "Connected, no campaigns";
              dotColor = "bg-stone-dark";
            } else {
              displayStatus = "Connected";
              dotColor = "bg-green";
            }
          } else if (conn.status === "PENDING") {
            displayStatus = "Not connected yet";
            dotColor = "bg-amber";
          } else if (conn.status === "ERROR") {
            displayStatus = "Error";
            dotColor = "bg-rust";
          }

          return (
            <div key={conn.id} className="bg-card p-6 flex justify-between items-center">
              <div>
                <div className="font-serif text-[16px] font-semibold flex items-center gap-2">
                  {conn.label || `Account ${conn.platformAccountId}`}
                  {!conn.isEnabled && <span className="text-[10px] uppercase font-bold bg-stone px-2 py-0.5 rounded-sm text-ink-soft">Disabled</span>}
                </div>
                <div className="text-[12px] text-ink-soft mt-1">
                  {!conn.lastSyncedAt ? (
                    "Not synced yet"
                  ) : (
                    <>{count} campaigns &middot; ₹{spend.toLocaleString()} (12mo spend) &middot; Last synced: {conn.lastSyncedAt.toLocaleDateString()}</>
                  )}
                </div>
              </div>
              <div className="text-[12px] font-semibold flex items-center text-ink-soft">
                <span className={`w-2 h-2 rounded-full inline-block mr-2 ${dotColor}`}></span>
                {displayStatus}
              </div>
            </div>
          );
        })}
        <div className="bg-card p-6 flex justify-between items-center">
          <div>
            <div className="font-serif text-[16px] font-semibold">Halte DB — Region data</div>
            <div className="text-[12px] text-ink-soft mt-1">Import not yet configured</div>
          </div>
          <div className="text-[12px] font-semibold flex items-center">
            <span className="w-2 h-2 rounded-full bg-stone-dark inline-block mr-2"></span>Not connected
          </div>
        </div>
      </div>
      
      {unmapped.length > 0 && isAdmin && (
        <UnmappedCampaigns campaigns={unmapped} brands={brands} products={products} />
      )}
    </div>
  );
}
