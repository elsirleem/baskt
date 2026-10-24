import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { getCurrentUserId, getWishlist, getWishlistShareToken } from "@/lib/data";
import { appUrl } from "@/lib/env";
import {
  MoveToCartButton,
  RemoveFromWishlistButton,
  ShareWishlist,
} from "@/components/WishlistControls";
import { BackLink, EmptyState, PageTitle, cardClass } from "@/components/ui";

export const metadata = { title: "Your wishlist" };

export default async function WishlistPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [items, shareToken] = await Promise.all([
    getWishlist(userId),
    getWishlistShareToken(userId),
  ]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🤍"
        title="Your wishlist is empty"
        text="Tap the heart on any product to save it for later."
        cta={{ href: "/", label: "Browse the shop" }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/account" label="Profile" />
      <PageTitle>Your Wishlist 🤍</PageTitle>

      <ShareWishlist shareUrl={shareToken && `${appUrl()}/wishlist/${shareToken}`} />

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className={`${cardClass} flex items-center gap-3 p-3.5`}>
            <Link
              href={`/product/${item.product.slug}`}
              tabIndex={-1}
              aria-hidden="true"
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-pale"
            >
              <Image
                src={item.product.imageUrl}
                alt={item.product.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${item.product.slug}`}
                className="line-clamp-1 text-sm font-semibold text-ink hover:text-brand"
              >
                {item.product.name}
              </Link>
              <p className="text-xs text-ink-soft">
                {[item.product.size, formatPrice(item.product.priceCents, item.product.currency)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-1.5 flex items-center gap-3">
                {item.product.archivedAt ? (
                  <span className="text-xs font-semibold text-ink-soft">No longer available</span>
                ) : (
                  <MoveToCartButton productId={item.productId} />
                )}
                <RemoveFromWishlistButton productId={item.productId} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
