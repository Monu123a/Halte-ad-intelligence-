"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ user }: { user?: { email: string; role: string } | null }) {
  const pathname = usePathname();

  // If we are on the login page, don't show the sidebar
  if (pathname === "/login") return null;

  const isLeadTagger = user?.role === "LEAD_TAGGER";
  const isMaster = user?.role === "MASTER";

  const navItems = [
    ...(isMaster ? [{ label: "Master Panel", href: "/master", requiresAdmin: false, requiresMaster: true, badge: "👑 MASTER" }] : []),
    { label: "Overview", href: "/", requiresAdmin: true },
    { label: "AI Advisor", href: "/ai-advisor", requiresAdmin: true, badge: "✨ AI" },
    { label: "Abandoned Carts", href: "/abandoned-carts", requiresAdmin: false },
    { label: "Lead Tagging", href: "/leads", requiresAdmin: false },
    { label: "Website Analytics", href: "/analytics", requiresAdmin: true },
    { label: "Geo Intelligence", href: "/geo", requiresAdmin: true },
    { label: "Brand Report", href: "/brand/Gardena", requiresAdmin: true },
    { label: "Download Reports", href: "/reports", requiresAdmin: true },
    { label: "Connections", href: "/connections", requiresAdmin: true },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  return (
    <div className="w-[240px] shrink-0 bg-slate text-stone px-6 py-8 sticky top-0 h-screen flex flex-col justify-between overflow-y-auto">
      <div>
        <div className="font-serif text-xl font-semibold text-white mb-[2px]">
          Halte <span className="text-stone">Ad Intelligence</span>
        </div>
        <div className="text-[11px] text-stone-dark mb-10 tracking-[0.02em]">
          Internal reporting tool
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isLocked = isLeadTagger && item.requiresAdmin;
            const isActive = 
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href);

            if (isLocked) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between text-[13.5px] py-2.5 px-2 text-stone-dark/40 cursor-not-allowed select-none rounded-sm"
                  title="Locked: Restricted to Admin/Analyst"
                >
                  <span className="flex items-center gap-[11px]">
                    <span className="w-[5px] h-[5px] rounded-full shrink-0 bg-stone-dark/30"></span>
                    {item.label}
                  </span>
                  <span className="text-[11px] opacity-50">🔒</span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between text-[14px] py-3 px-1 cursor-pointer border-l-2 transition-all ${
                  isActive
                    ? "text-white font-semibold border-white pl-[14px]"
                    : "text-stone border-transparent hover:text-white"
                }`}
              >
                <span className="flex items-center gap-[11px]">
                  <span
                    className={`w-[5px] h-[5px] rounded-full shrink-0 ${
                      isActive ? "bg-white" : "bg-stone-dark"
                    }`}
                  ></span>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile & sign out footer */}
      <div className="pt-6 border-t border-stone-dark/20 text-[12px]">
        {user && (
          <div className="mb-3">
            <div className="text-white font-medium text-[12.5px] truncate" title={user.email}>
              {user.email}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                user.role === "MASTER"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-400/40"
                  : user.role === "ADMIN" 
                  ? "bg-green/20 text-green border border-green/30" 
                  : user.role === "LEAD_TAGGER" 
                  ? "bg-amber-tint text-amber border border-[#e3d3a8]" 
                  : "bg-stone/20 text-stone border border-stone-dark/30"
              }`}>
                {user.role === "MASTER" ? "👑 Master Authority" : user.role === "LEAD_TAGGER" ? "Lead Tagger" : user.role}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="text-stone-dark hover:text-white transition-colors flex items-center gap-1.5 text-[11.5px] font-medium py-1"
        >
          <span className="text-[13px]">⏻</span> Sign out
        </button>
      </div>
    </div>
  );
}
