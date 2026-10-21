"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Products", isActive: (p: string) => p === "/admin" || p.startsWith("/admin/products") },
  { href: "/admin/orders", label: "Orders", isActive: (p: string) => p.startsWith("/admin/orders") },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-2">
      {TABS.map(({ href, label, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              active ? "bg-ink text-white" : "bg-white text-ink-mid hover:text-brand"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
