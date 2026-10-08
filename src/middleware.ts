import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;

  // Allow auth API routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  
  // Public routes
  if (pathname === "/login") {
    if (token) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // To enforce Admin roles strictly, we might decode JWT here. 
  // However, edge runtime doesn't support jsonwebtoken easily.
  // The actual action endpoints (e.g. Meta OAuth connect, sync trigger) 
  // should verify the session role using `getSession()` in the route handler.
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
