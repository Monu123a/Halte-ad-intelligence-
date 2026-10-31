import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function parseJwtPayload(token: string): { role?: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;
  const payload = token ? parseJwtPayload(token) : null;
  const isLeadTagger = payload?.role === "LEAD_TAGGER";
  const isMaster = payload?.role === "MASTER";

  // Restrict Master Panel to MASTER role only
  if (pathname.startsWith("/master") || pathname.startsWith("/api/master")) {
    if (!isMaster) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: Master authority required" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Allow auth, webhook, and cron API routes
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron")
  ) {
    return NextResponse.next();
  }
  
  // Public routes
  if (pathname === "/login") {
    if (token) {
      return NextResponse.redirect(new URL(isLeadTagger ? "/leads" : "/", req.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Restrict LEAD_TAGGER: allowed to access /leads, /abandoned-carts, and their APIs
  if (isLeadTagger) {
    const isAllowed = 
      pathname === "/leads" || 
      pathname.startsWith("/leads/") || 
      pathname.startsWith("/api/leads") ||
      pathname === "/abandoned-carts" ||
      pathname.startsWith("/abandoned-carts/") ||
      pathname.startsWith("/api/abandoned-carts") ||
      pathname.startsWith("/api/sync/abandoned-carts");

    if (!isAllowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: Access restricted to Lead Tagging and Abandoned Carts" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/leads", req.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
