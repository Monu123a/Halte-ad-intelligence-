import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MasterPanelClient } from "@/components/MasterPanelClient";

export const dynamic = "force-dynamic";

export default async function MasterPanelPage() {
  const session = await getSession();

  // Strict Master authorization check
  if (!session || session.role !== "MASTER") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <MasterPanelClient currentUserId={session.id} currentUserEmail={session.email} />
    </div>
  );
}
