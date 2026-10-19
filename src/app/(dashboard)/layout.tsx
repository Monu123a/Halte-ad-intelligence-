import { Sidebar } from "@/components/Sidebar";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session} />
      <main className="flex-1 px-14 py-11 min-w-0">
        {children}
      </main>
    </div>
  );
}
