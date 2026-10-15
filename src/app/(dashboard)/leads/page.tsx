import { getLeadsData } from "@/lib/services";
import LeadsClient from "./LeadsClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: { tag?: string, q?: string } }) {
  const currentTag = searchParams.tag || "UNTAGGED";
  const query = searchParams.q || "";
  
  const leads = await getLeadsData(currentTag, query);

  return <LeadsClient initialLeads={leads} currentTag={currentTag} />;
}
