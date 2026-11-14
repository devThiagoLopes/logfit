import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { QueryProvider } from "@/components/providers/query-provider";
import { auth } from "@/lib/auth/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return (
    <QueryProvider>
      <div className="flex h-screen flex-col bg-white">
        <Header userName={session.user.name || session.user.email} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto [transform:translateZ(0)]">
            {children}
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}
