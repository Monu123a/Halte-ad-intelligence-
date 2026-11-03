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
  searchParams?: { timeRange?: string; range?: string; brand?: string; from?: string; to?: string };
}) {
  const session = await getSession();
  if (session?.role === "LEAD_TAGGER") {
    redirect("/leads");
  }

  const rangeParam = searchParams?.range || searchParams?.timeRange || "all";
  const validRange =
    rangeParam === "7d"
      ? "7d"
      : rangeParam === "90d"
      ? "90d"
      : rangeParam === "30d"
      ? "30d"
      : rangeParam === "custom"
      ? "custom"
      : "all";

  const brand = searchParams?.brand || "ALL";
  const from = searchParams?.from;
  const to = searchParams?.to;

  const customRange = (validRange === "custom" && from)
    ? {
        from: new Date(from.includes("T") ? from : `${from}T00:00:00.000Z`),
        to: to ? new Date(to.includes("T") ? to : `${to}T23:59:59.999Z`) : new Date(new Date().setHours(23, 59, 59, 999))
      }
    : undefined;

  const report = await getGeographicalReport(validRange, brand, customRange);

  return <GeoClient initialData={report} />;
}

