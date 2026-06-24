import Link from "next/link";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/data";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isCurrentUserAdmin())) redirect("/");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Admin</h1>
          <span className="rounded bg-stone-800 px-2 py-0.5 text-xs font-medium text-white">
            Products
          </span>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + New product
        </Link>
      </div>
      {children}
    </div>
  );
}
