import Link from "next/link";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/data";
import { buttonClass } from "@/components/ui";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isCurrentUserAdmin())) redirect("/");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold">Admin</h1>
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-white">
            Products
          </span>
        </div>
        <Link href="/admin/products/new" className={`${buttonClass.primary} px-4 py-2.5 text-sm`}>
          + New product
        </Link>
      </div>
      {children}
    </div>
  );
}
