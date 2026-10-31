import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden: Master authority required" }, { status: 403 });
  }

  try {
    const [allUsers, totalSessions, totalMessages, recentSessions] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              aiChatSessions: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.aIChatSession.count(),
      prisma.aIChatMessage.count(),
      prisma.aIChatSession.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, role: true }
          },
          messages: {
            take: 2,
            orderBy: { createdAt: "asc" }
          }
        }
      })
    ]);

    // Aggregate statistics
    const roleCounts = allUsers.reduce((acc: Record<string, number>, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: allUsers.length,
        totalSessions,
        totalMessages,
        roleCounts
      },
      users: allUsers,
      recentSessions
    });
  } catch (error: any) {
    console.error("[Master Overview Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to load master overview" }, { status: 500 });
  }
}
