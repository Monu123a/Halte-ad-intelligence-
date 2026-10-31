import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden: Master authority required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") || undefined;
  const searchQuery = searchParams.get("q")?.trim() || "";

  try {
    const whereClause: any = {};
    if (targetUserId) {
      whereClause.userId = targetUserId;
    }
    if (searchQuery) {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        {
          messages: {
            some: {
              content: { contains: searchQuery, mode: "insensitive" }
            }
          }
        },
        {
          user: {
            email: { contains: searchQuery, mode: "insensitive" }
          }
        }
      ];
    }

    const sessions = await prisma.aIChatSession.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error("[Master Chat History Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch chat history" }, { status: 500 });
  }
}
