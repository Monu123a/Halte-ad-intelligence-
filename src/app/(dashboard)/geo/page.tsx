import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getGeographicalReport } from "@/lib/geoIntelligence";
import { GeoClient } from "./GeoClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Geographical Intelligence | Halte Ad Intelligence",
  description: "State, city and district ad intelligence, lead generation performance and campaign targeting matrix."
};

export default async function GeoIntelligencePage() {
  const session = await getSession();
  if (session?.role === "LEAD_TAGGER") {
    redirect("/leads");
  }

  const report = await getGeographicalReport();

  return <GeoClient initialData={report} />;
}
