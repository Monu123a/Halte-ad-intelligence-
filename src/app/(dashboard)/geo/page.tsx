import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getGeographicalReport } from "@/lib/geoIntelligence";
import { GeoClient } from "./GeoClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Geographical Intelligence | Halte Ad Intelligence",
  description: "State, city and district ad intelligence, lead generation performance and campaign targeting matrix."
};

export default async function GeoIntelligencePage({
  searchParams,
}: {
  searchParams?: { timeRange?: string };
}) {
  const session = await getSession();
  if (session?.role === "LEAD_TAGGER") {
    redirect("/leads");
  }

  const validRange =
    searchParams?.timeRange === "90d"
      ? "90d"
      : searchParams?.timeRange === "30d"
      ? "30d"
      : "all";

  const report = await getGeographicalReport(validRange);

  return <GeoClient initialData={report} />;
}

