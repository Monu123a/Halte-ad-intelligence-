import { getAbandonedCartsData } from "@/lib/services";
import { getSession } from "@/lib/auth";
import AbandonedCartsClient from "./AbandonedCartsClient";

export const dynamic = "force-dynamic";

export default async function AbandonedCartsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; range?: string };
}) {
  const currentStatus = searchParams.status || "ALL";
  const query = searchParams.q || "";
  const range = searchParams.range || "30d";

  const [session, data] = await Promise.all([
    getSession(),
    getAbandonedCartsData({
      status: currentStatus,
      search: query,
      range,
    }),
  ]);

  return (
    <AbandonedCartsClient
      initialCarts={data.carts as any}
      summary={data.summary}
      currentStatus={currentStatus}
      searchQuery={query}
      currentRange={range}
      userRole={session?.role || "ANALYST"}
      userEmail={session?.email || ""}
    />
  );
}
