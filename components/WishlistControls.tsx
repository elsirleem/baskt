"use client";

import { useTransition } from "react";
import { removeFromWishlist, moveToCart } from "@/lib/actions/wishlist";

export function MoveToCartButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => moveToCart(productId))}
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {pending ? "Moving…" : "Move to cart"}
    </button>
  );
}

export function RemoveFromWishlistButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => removeFromWishlist(productId))}
      className="text-sm text-stone-500 hover:text-red-600 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
