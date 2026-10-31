import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "MASTER")) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  // Admin and Master accounts should NOT be visible in regular user lists
  const users = await prisma.user.findMany({
    where: {
      role: { notIn: ["ADMIN", "MASTER"] }
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "MASTER")) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    
    // Only MASTER can assign ADMIN or MASTER roles; regular admins can only create ANALYST or LEAD_TAGGER
    let cleanRole: "MASTER" | "ADMIN" | "ANALYST" | "LEAD_TAGGER" = "ANALYST";
    if (role === "LEAD_TAGGER") {
      cleanRole = "LEAD_TAGGER";
    } else if (role === "ADMIN" && session.role === "MASTER") {
      cleanRole = "ADMIN";
    } else if (role === "MASTER" && session.role === "MASTER") {
      cleanRole = "MASTER";
    } else {
      cleanRole = "ANALYST";
    }

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        role: cleanRole
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
