import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCartCount, getUserSummary } from "@/lib/data";
import { greeting } from "@/lib/utils";
import { DesktopNav } from "@/components/Navigation";
import { BasketIcon } from "@/components/icons";

export function Logo() {
  return (
    <Link
      href="/"
      className="font-display text-[22px] font-black tracking-tight text-brand md:text-2xl"
    >
      Afro<span className="text-gold">Pantry</span>
    </Link>
  );
}

export async function Header() {
  const session = await auth();
  const userId = session?.user?.id;
  const [cartCount, user] = userId
    ? await Promise.all([getCartCount(userId), getUserSummary(userId)])
    : [0, null];

  const firstName = user?.name?.split(" ")[0];

  return (
    <header className="md:border-b md:border-line md:bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 pb-3 pt-4 md:px-6 md:py-4">
        <div className="min-w-0">
          <Logo />
          <p className="truncate text-xs text-ink-soft md:hidden">
            {firstName
              ? `${greeting(new Date())}, ${firstName} 👋`
              : "African essentials, delivered across the UK"}
          </p>
        </div>

        <DesktopNav />

        <div className="flex items-center gap-2.5">
          {user?.isAdmin && (
            <Link
              href="/admin"
              className="hidden rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-mid hover:border-brand hover:text-brand md:inline-block"
            >
              Admin
            </Link>
          )}

          <Link
            href="/cart"
            aria-label={`Basket, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition hover:text-brand md:border md:border-line md:shadow-none"
          >
            <BasketIcon className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {userId ? (
            <Link
              href="/account"
              aria-label="Your profile"
              className="hidden h-10 w-10 items-center justify-center rounded-full bg-brand font-display text-lg font-bold text-white transition hover:bg-brand-light md:flex"
            >
              {(user?.name ?? session?.user?.email ?? "?").charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-light"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
