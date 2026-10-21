"use client";

import { useTransition } from "react";
import { updateCartQuantity, removeFromCart } from "@/lib/actions/cart";

export function QuantityControl({
  productId,
  quantity,
  max,
}: {
  productId: string;
  quantity: number;
  /** Units in stock; "+" stops here. */
  max: number;
}) {
  const [pending, startTransition] = useTransition();

  const set = (q: number) =>
    startTransition(() => updateCartQuantity(productId, q));

  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg bg-brand-pale px-2.5 py-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => set(quantity - 1)}
        className="w-5 text-base font-bold leading-none text-brand disabled:opacity-50"
        aria-label={quantity <= 1 ? "Remove from basket" : "Decrease quantity"}
      >
        −
      </button>
      <span className="min-w-4 text-center text-sm font-bold text-ink">{quantity}</span>
      <button
        type="button"
        disabled={pending || quantity >= max}
        onClick={() => set(quantity + 1)}
        className="w-5 text-base font-bold leading-none text-brand disabled:opacity-50"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export function RemoveFromCartButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => removeFromCart(productId))}
      className="text-xs font-medium text-ink-soft hover:text-danger disabled:opacity-50"
    >
      Remove
    </button>
  );
}
