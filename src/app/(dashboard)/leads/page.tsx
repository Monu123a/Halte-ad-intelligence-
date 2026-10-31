import { getLeadsData } from "@/lib/services";
import LeadsClient from "./LeadsClient";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

let cachedAdSets: { data: any[]; expiresAt: number } | null = null;

async function getCachedAdSets() {
  const now = Date.now();
  if (cachedAdSets && now < cachedAdSets.expiresAt) {
    return cachedAdSets.data;
  }
  const adSets = await prisma.adSet.findMany({
    select: {
      id: true,
      name: true,
      campaign: {
        select: {
          name: true,
          brand: { select: { name: true } }
        }
      }
    },
    orderBy: { name: "asc" }
  });
  cachedAdSets = { data: adSets, expiresAt: now + 600000 }; // 10 minutes cache
  return adSets;
}

export default async function LeadsPage({ searchParams }: { searchParams: { tag?: string, q?: string } }) {
  const currentTag = searchParams.tag || "UNTAGGED";
  const query = searchParams.q || "";

  const session = await getSession();
  const isAdmin = session?.role === "ADMIN" || session?.role === "MASTER";
  
  const [leads, adSets, users] = await Promise.all([
    getLeadsData(currentTag, query),
    getCachedAdSets(),
    isAdmin
      ? prisma.user.findMany({
          where: { role: { notIn: ["ADMIN", "MASTER"] } },
          select: { id: true, email: true, role: true, createdAt: true },
          orderBy: { createdAt: "desc" }
        })
      : []
  ]);

  return (
    <LeadsClient 
      initialLeads={leads} 
      currentTag={currentTag} 
      availableAdSets={adSets}
      isAdmin={isAdmin}
      initialUsers={users}
      currentUserId={session?.id}
    />
  );
}

