import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCartCount, isCurrentUserAdmin } from "@/lib/data";
import { logoutUser } from "@/lib/actions/auth";

export async function Header() {
  const session = await auth();
  const userId = session?.user?.id;
  const [cartCount, isAdmin] = userId
    ? await Promise.all([getCartCount(userId), isCurrentUserAdmin()])
    : [0, false];

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4">
        <Link href="/" className="text-xl font-bold text-emerald-700 whitespace-nowrap">
          🧺 Baskt
        </Link>

        <form action="/" className="order-last w-full sm:order-none sm:max-w-xs sm:flex-1">
          <input
            type="search"
            name="q"
            placeholder="Search African groceries…"
            aria-label="Search products"
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
          />
        </form>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-stone-600 hover:text-stone-900">
            Shop
          </Link>
          <Link href="/recipes" className="text-stone-600 hover:text-stone-900">
            Recipes
          </Link>
          <Link href="/fresh" className="text-stone-600 hover:text-stone-900">
            Fresh Box
          </Link>
          <Link href="/membership" className="text-stone-600 hover:text-stone-900">
            Membership
          </Link>
          <Link href="/wishlist" className="text-stone-600 hover:text-stone-900">
            Wishlist
          </Link>
          {userId && (
            <Link href="/orders" className="text-stone-600 hover:text-stone-900">
              Orders
            </Link>
          )}
          {userId && (
            <Link href="/account" className="text-stone-600 hover:text-stone-900">
              Account
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="font-medium text-stone-900 hover:text-emerald-700">
              Admin
            </Link>
          )}
          <Link href="/cart" className="relative text-stone-600 hover:text-stone-900">
            Cart
            {cartCount > 0 && (
              <span className="absolute -right-4 -top-2 rounded-full bg-emerald-600 px-1.5 text-xs font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {userId ? (
            <>
              <span className="hidden text-stone-400 sm:inline">
                {session?.user?.name ?? session?.user?.email}
              </span>
              <form action={logoutUser}>
                <button
                  type="submit"
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-stone-700 hover:bg-stone-100"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
