import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStoreMetricsSummary } from "@/lib/halteStoreDb";
import { AIAdvisorChat } from "@/components/AIAdvisorChat";

export const dynamic = "force-dynamic";

export default async function AIAdvisorPage() {
  const session = await getSession();
  if (session?.role === "LEAD_TAGGER") {
    redirect("/leads");
  }

  const storeSummary = await getStoreMetricsSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone pb-5">
        <div>
          <h1 className="font-serif text-[28px] font-semibold text-ink m-0">
            AI Marketing &amp; Revenue Advisor
          </h1>
          <p className="text-[13.5px] text-ink-soft m-0 mt-0.5">
            Interactive CMO copilot cross-referencing live Meta, Google &amp; Amazon ads with real Halte store revenue
          </p>
        </div>
      </div>

      <AIAdvisorChat storeSummary={storeSummary} />
    </div>
  );
}
