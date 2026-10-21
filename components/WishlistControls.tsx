"use client";

import { useState, useTransition } from "react";
import { moveToCart } from "@/lib/actions/cart";
import { removeFromWishlist } from "@/lib/actions/wishlist";
import { buttonClass } from "@/components/ui";

export function MoveToCartButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await moveToCart(productId);
            setError(result.ok ? null : result.error);
          })
        }
        className={buttonClass.soft}
      >
        {pending ? "Moving…" : "Move to basket"}
      </button>
      {error && (
        <span role="status" className="text-xs text-gold-dark">
          {error}
        </span>
      )}
    </>
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
