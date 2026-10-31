import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStoreMetricsSummary } from "@/lib/halteStoreDb";
import { UnmappedCampaigns } from "@/components/UnmappedCampaigns";
import { TeamManagement } from "@/components/TeamManagement";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage({
  searchParams
}: {
  searchParams?: { error?: string; success?: string; appId?: string };
}) {
  const session = await getSession();
  if (session?.role === "LEAD_TAGGER") {
    redirect("/leads");
  }

  const isAdmin = session?.role === "ADMIN" || session?.role === "MASTER";

  const [connections, unmapped, brands, users, storeStats] = await Promise.all([
    prisma.adConnection.findMany(),
    prisma.campaign.findMany({ where: { brandPageId: null } }),
    prisma.brand.findMany(),
    isAdmin 
      ? prisma.user.findMany({ 
          where: { role: { notIn: ["ADMIN", "MASTER"] } },
          select: { id: true, email: true, role: true, createdAt: true }, 
          orderBy: { createdAt: "desc" } 
        })
      : Promise.resolve([]),
    getStoreMetricsSummary()
  ]);

  // List of valid products for campaign mapping & seasonal rules
  const products = [
    "BBQ",
    "Brush Cutters",
    "Chainsaw",
    "Combisystem",
    "Cord Organiser",
    "Drip irrigation",
    "Firepit",
    "Fogging Machine",
    "Garden Machinery",
    "Garden Pruners",
    "Gensets",
    "Glues",
    "Hand Tools",
    "Hose Reels",
    "Lawn Mowers",
    "Leaf Blowers",
    "Mounting Tape",
    "Pole Pruners",
    "Portable Sprayers",
    "Snow Chains",
    "Sprinklers",
    "Tillers",
    "Trimmers",
    "Velcro Tapes",
    "Waterproof Tape"
  ];

  const hasMetaError = connections.some(c => c.platform === "META" && c.status === "ERROR");

  return (
    <div>
      {searchParams?.error === "InvalidAppId" && (
        <div className="mb-6 p-4 bg-rust-tint border border-rust/30 rounded-md text-[13px] flex items-start gap-3">
          <span className="text-[18px]">⚠️</span>
          <div>
            <b className="font-semibold text-ink">Invalid Meta App ID Configured</b>
            <p className="mt-1 text-ink-soft">
              The Meta App ID configured in Vercel environment variables ({searchParams?.appId ? `"${searchParams.appId}"` : "empty"}) is not a valid Meta App ID.
            </p>
            <div className="mt-2 text-[12px] text-ink-soft bg-white/70 p-2.5 rounded border border-rust/20">
              <b className="text-ink">How to resolve in Vercel:</b>
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>Go to your Vercel Project Dashboard &rarr; <b>Settings</b> &rarr; <b>Environment Variables</b>.</li>
                <li>Check <code className="bg-stone/50 px-1 py-0.5 rounded font-mono text-ink">META_APP_ID</code> and ensure it contains your real numeric App ID from <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="underline font-semibold text-ink">developers.facebook.com</a> (only numbers, without surrounding quotes).</li>
                <li>Ensure <code className="bg-stone/50 px-1 py-0.5 rounded font-mono text-ink">META_APP_SECRET</code> matches the App Secret from Meta Developer console.</li>
                <li>Make sure your Facebook App is set to <b>Live</b> (or that your account is added under <b>App Roles</b>) in Meta Developer portal.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {searchParams?.error && searchParams.error !== "InvalidAppId" && (
        <div className="mb-6 p-4 bg-rust-tint border border-rust/30 rounded-md text-[13px] text-rust flex items-center gap-3">
          <span className="text-[18px]">⚠️</span>
          <span>Authentication Error: {decodeURIComponent(searchParams.error)}</span>
        </div>
      )}

      {hasMetaError && !searchParams?.error && (
        <div className="mb-6 p-4 bg-amber-tint border border-[#e3d3a8] rounded-md text-[13px] flex items-start gap-3">
          <span className="text-[18px]">ℹ️</span>
          <div>
            <b className="font-semibold text-ink">Meta Connections Session Expired</b>
            <p className="mt-0.5 text-ink-soft text-[12.5px]">
              The previous 60-day Meta Graph API access token expired. Please click <b>Reconnect</b> below with your Admin Facebook account to renew sync permissions.
            </p>
          </div>
        </div>
      )}

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
            <>
              <Link 
                href="/api/auth/meta/connect" 
                className="bg-ink text-white py-2 px-4 rounded-sm text-[12.5px] font-semibold hover:bg-ink/90 transition-colors"
              >
                Connect Meta
              </Link>
              <Link 
                href="/api/auth/google/connect" 
                className="bg-[#EA4335] text-white py-2 px-4 rounded-sm text-[12.5px] font-semibold hover:opacity-90 transition-opacity"
              >
                Connect Google Ads
              </Link>
              <Link 
                href="/api/auth/amazon/connect" 
                className="bg-[#FF9900] text-white py-2 px-4 rounded-sm text-[12.5px] font-semibold hover:opacity-90 transition-opacity ml-2"
              >
                Connect Amazon Ads
              </Link>
            </>
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
          
          const reconnectUrl = conn.platform === "GOOGLE" ? "/api/auth/google/connect" : "/api/auth/meta/connect";

          return (
            <div key={conn.id} className="bg-card p-6 flex justify-between items-center">
              <div>
                <div className="font-serif text-[16px] font-semibold flex items-center gap-2">
                  {conn.platform === "GOOGLE" && <span className="bg-[#FCE8E6] text-[#EA4335] text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Google</span>}
                  {conn.platform === "META" && <span className="bg-[#E7F0FF] text-[#1877F2] text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Meta</span>}
                  {conn.platform === "AMAZON" && <span className="bg-[#FEF5E6] text-[#FF9900] text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Amazon</span>}
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
                {conn.status === "ERROR" && isAdmin && (
                  <Link 
                    href={reconnectUrl} 
                    className="ml-4 bg-rust-tint text-rust py-1 px-3 rounded-sm hover:bg-rust hover:text-white transition-colors"
                  >
                    Reconnect
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        <div className="bg-card p-6 flex justify-between items-center">
          <div>
            <div className="font-serif text-[16px] font-semibold flex items-center gap-2">
              <span className="bg-green-tint text-green text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">
                Live
              </span>
              Halte.in &mdash; Website Telemetry &amp; Behavior
            </div>
            <div className="text-[12px] text-ink-soft mt-1">
              {await prisma.websiteAnalytics.count().then((c) => c.toLocaleString())} pageviews &amp; sessions &middot; Live telemetry active
            </div>
          </div>
          <div className="text-[12px] font-semibold flex items-center text-ink-soft">
            <span className="w-2 h-2 rounded-full bg-green inline-block mr-2"></span>
            Connected
          </div>
        </div>
        <div className="bg-card p-6 flex justify-between items-center">
          <div>
            <div className="font-serif text-[16px] font-semibold flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm border border-indigo-200">
                Postgres
              </span>
              Halte Production Store Database
            </div>
            <div className="text-[12px] text-ink-soft mt-1">
              {storeStats.connected ? (
                <>{storeStats.totalOrders.toLocaleString()} orders &middot; ₹{((storeStats.netRevenue || 0) / 10000000).toFixed(2)} Cr net revenue &middot; {storeStats.totalCustomers.toLocaleString()} customers</>
              ) : (
                "Connecting to store database..."
              )}
            </div>
          </div>
          <div className="text-[12px] font-semibold flex items-center text-ink-soft">
            <span className={`w-2 h-2 rounded-full ${storeStats.connected ? "bg-green" : "bg-amber"} inline-block mr-2`}></span>
            {storeStats.connected ? "Connected" : "Disconnected"}
          </div>
        </div>
      </div>
      
      {unmapped.length > 0 && isAdmin && (
        <UnmappedCampaigns campaigns={unmapped} brands={brands} products={products} />
      )}

      {isAdmin && (
        <TeamManagement initialUsers={users} currentUserId={session?.id} />
      )}
    </div>
  );
}
