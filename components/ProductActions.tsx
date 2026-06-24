"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/actions/cart";
import { toggleWishlist } from "@/lib/actions/wishlist";

export function AddToCartButton({
  productId,
  className = "",
}: {
  productId: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => addToCart(productId))}
      className={`rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 ${className}`}
    >
      {pending ? "Adding…" : "Add to cart"}
    </button>
  );
}

export function WishlistButton({
  productId,
  inWishlist,
}: {
  productId: string;
  inWishlist: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      aria-pressed={inWishlist}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleWishlist(productId);
          router.refresh();
        })
      }
      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-lg leading-none hover:bg-stone-50 disabled:opacity-60"
    >
      <span className={inWishlist ? "text-red-500" : "text-stone-400"}>
        {inWishlist ? "♥" : "♡"}
      </span>
    </button>
  );
}
