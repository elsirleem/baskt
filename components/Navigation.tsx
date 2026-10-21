"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BasketIcon, HomeIcon, PotIcon, StarIcon, UserIcon } from "@/components/icons";

/** True when the current path belongs to one of a nav item's sections. */
function isActive(pathname: string, match: string[]): boolean {
  return match.some((m) =>
    m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(`${m}/`),
  );
}

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon, match: ["/", "/product"] },
  { href: "/recipes", label: "Recipes", Icon: PotIcon, match: ["/recipes"] },
  { href: "/cart", label: "Basket", Icon: BasketIcon, match: ["/cart", "/checkout"] },
  { href: "/membership", label: "Plans", Icon: StarIcon, match: ["/membership"] },
  {
    href: "/account",
    label: "Profile",
    Icon: UserIcon,
    match: ["/account", "/orders", "/wishlist", "/login", "/register"],
  },
];

const DESKTOP_LINKS = [
  { href: "/", label: "Shop", match: ["/", "/product"] },
  { href: "/recipes", label: "Recipes", match: ["/recipes"] },
  { href: "/fresh", label: "Fresh Box", match: ["/fresh"] },
  { href: "/membership", label: "Plans", match: ["/membership"] },
];

/** Bottom tab bar, shown on phones only. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = isActive(pathname, match);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 pb-2 pt-2.5"
              >
                <Icon className={`h-6 w-6 ${active ? "text-brand" : "text-ink-soft"}`} />
                <span
                  className={`h-1 w-1 rounded-full ${active ? "bg-brand" : "bg-transparent"}`}
                />
                <span
                  className={`text-[10px] ${
                    active ? "font-semibold text-brand" : "font-medium text-ink-soft"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Text links in the header, shown on wider screens. */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
      {DESKTOP_LINKS.map(({ href, label, match }) => {
        const active = isActive(pathname, match);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`text-sm font-semibold transition ${
              active ? "text-brand" : "text-ink-mid hover:text-brand"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
