"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  // If we are on the login page, don't show the sidebar
  if (pathname === "/login") return null;

  const navItems = [
    { label: "Overview", href: "/" },
    { label: "Brand Report", href: "/brand/Gardena" }, // Default to Gardena
    { label: "Lead Tagging", href: "/leads" },
    { label: "Connections", href: "/connections" },
  ];

  return (
    <div className="w-[240px] shrink-0 bg-slate text-stone px-6 py-8 sticky top-0 h-screen overflow-y-auto">
      <div className="font-serif text-xl font-semibold text-white mb-[2px]">
        Halte <span className="text-stone">Ad Intelligence</span>
      </div>
      <div className="text-[11px] text-stone-dark mb-10 tracking-[0.02em]">
        Internal reporting tool
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          // simple match for active state
          const isActive = 
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-[11px] text-[14px] py-3 px-1 cursor-pointer border-l-2 transition-all ${
                isActive
                  ? "text-white font-semibold border-white pl-[14px]"
                  : "text-stone border-transparent hover:text-white"
              }`}
            >
              <span
                className={`w-[5px] h-[5px] rounded-full shrink-0 ${
                  isActive ? "bg-white" : "bg-stone-dark"
                }`}
              ></span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
