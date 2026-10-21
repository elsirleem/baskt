import { requireAdmin } from "@/lib/data";
import { AdminTabs } from "@/components/AdminTabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pages and queries check too; layouts don't re-run on client navigation.
  await requireAdmin();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <h1 className="font-display text-2xl font-bold">Admin</h1>
        <AdminTabs />
      </div>
      {children}
    </div>
  );
}
