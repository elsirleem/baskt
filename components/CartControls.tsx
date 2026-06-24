"use client";

import { useTransition } from "react";
import { updateCartQuantity, removeFromCart } from "@/lib/actions/cart";

export function QuantityControl({
  productId,
  quantity,
}: {
  productId: string;
  quantity: number;
}) {
  const [pending, startTransition] = useTransition();

  const set = (q: number) =>
    startTransition(() => updateCartQuantity(productId, q));

  return (
    <div className="inline-flex items-center rounded-md border border-stone-300">
      <button
        type="button"
        disabled={pending}
        onClick={() => set(quantity - 1)}
        className="px-3 py-1 text-lg leading-none hover:bg-stone-100 disabled:opacity-50"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-8 text-center text-sm">{quantity}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => set(quantity + 1)}
        className="px-3 py-1 text-lg leading-none hover:bg-stone-100 disabled:opacity-50"
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
      className="text-sm text-stone-500 hover:text-red-600 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
