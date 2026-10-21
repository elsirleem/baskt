"use client";

import { useTransition } from "react";
import { removeFromWishlist, moveToCart } from "@/lib/actions/wishlist";
import { buttonClass } from "@/components/ui";

export function MoveToCartButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => moveToCart(productId))}
      className={buttonClass.soft}
    >
      {pending ? "Moving…" : "Move to basket"}
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
      className="text-xs font-medium text-ink-soft hover:text-danger disabled:opacity-50"
    >
      Remove
    </button>
  );
}
