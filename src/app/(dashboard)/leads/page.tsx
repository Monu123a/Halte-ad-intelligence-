import prisma from "@/lib/prisma";
import LeadsClient from "./LeadsClient";

export default async function LeadsPage({ searchParams }: { searchParams: { tag?: string, q?: string } }) {
  const currentTag = searchParams.tag || "UNTAGGED";
  const query = searchParams.q || "";
  
  const leads = await prisma.lead.findMany({
    where: {
      AND: [
        currentTag === "ALL" ? {} : { tag: currentTag as any },
        query ? {
          OR: [
            { contactRef: { contains: query, mode: 'insensitive' } },
            { messageText: { contains: query, mode: 'insensitive' } }
          ]
        } : {}
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 500, // Reasonable limit for MVP
    include: {
      adSet: {
        include: {
          campaign: {
            include: { brand: true }
          }
        }
      }
    }
  });

  return <LeadsClient initialLeads={leads} currentTag={currentTag} />;
}
