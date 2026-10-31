import { getLeadsData } from "@/lib/services";
import LeadsClient from "./LeadsClient";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: { tag?: string, q?: string } }) {
  const currentTag = searchParams.tag || "UNTAGGED";
  const query = searchParams.q || "";

  const session = await getSession();
  const isAdmin = session?.role === "ADMIN" || session?.role === "MASTER";
  
  const [leads, adSets, users] = await Promise.all([
    getLeadsData(currentTag, query),
    prisma.adSet.findMany({
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
    }),
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

