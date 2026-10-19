import { getLeadsData } from "@/lib/services";
import LeadsClient from "./LeadsClient";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: { tag?: string, q?: string } }) {
  const currentTag = searchParams.tag || "UNTAGGED";
  const query = searchParams.q || "";
  
  const [leads, adSets] = await Promise.all([
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
    })
  ]);

  return <LeadsClient initialLeads={leads} currentTag={currentTag} availableAdSets={adSets} />;
}
