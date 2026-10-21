"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/actions/cart";
import { toggleWishlist } from "@/lib/actions/wishlist";
import { formatPrice } from "@/lib/utils";
import { buttonClass } from "@/components/ui";
import { HeartIcon } from "@/components/icons";

const MAX_QUANTITY = 99;

/** Shows a tick for a moment after a successful add. */
function useAdd(productId: string) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const add = (quantity = 1) =>
    startTransition(async () => {
      await addToCart(productId, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    });

  return { pending, added, add };
}

/** Compact add button: a green "+" square on product cards, or a "+ Add" pill. */
export function AddToCartButton({
  productId,
  productName,
  variant = "icon",
  disabled = false,
}: {
  productId: string;
  productName: string;
  variant?: "icon" | "pill";
  disabled?: boolean;
}) {
  const { pending, added, add } = useAdd(productId);

  if (variant === "pill") {
    return (
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => add()}
        aria-label={`Add ${productName} to basket`}
        className={`${buttonClass.soft} shrink-0`}
      >
        {disabled ? "Sold out" : added ? "✓ Added" : pending ? "Adding…" : "+ Add"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={() => add()}
      aria-label={disabled ? `${productName} is out of stock` : `Add ${productName} to basket`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-lg font-light leading-none text-white transition hover:bg-brand-light disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft"
    >
      {added ? "✓" : pending ? "…" : "+"}
    </button>
  );
}

/** Quantity picker plus a full-width "Add to Basket — £x" button for the product page. */
export function AddWithQuantity({
  productId,
  priceCents,
  currency,
  disabled = false,
}: {
  productId: string;
  priceCents: number;
  currency: string;
  disabled?: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const { pending, added, add } = useAdd(productId);

  const change = (delta: number) =>
    setQuantity((q) => Math.min(Math.max(q + delta, 1), MAX_QUANTITY));

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <span className="text-sm font-medium text-ink-mid">Quantity</span>
        <div className="flex items-center gap-3.5 rounded-xl bg-brand-pale px-4 py-1.5">
          <button
            type="button"
            onClick={() => change(-1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="w-6 text-xl font-bold leading-none text-brand disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-5 text-center font-display text-lg font-bold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => change(1)}
            disabled={quantity >= MAX_QUANTITY}
            aria-label="Increase quantity"
            className="w-6 text-xl font-bold leading-none text-brand disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => add(quantity)}
        className={`${buttonClass.primary} w-full py-4 text-base`}
      >
        {disabled
          ? "Out of stock"
          : added
            ? "✓ Added to basket"
            : pending
              ? "Adding…"
              : `Add to Basket — ${formatPrice(priceCents * quantity, currency)}`}
      </button>
    </div>
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
      aria-label={inWishlist ? "Remove from wishlist" : "Save to wishlist"}
      title={inWishlist ? "Remove from wishlist" : "Save to wishlist"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleWishlist(productId);
          router.refresh();
        })
      }
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-white transition hover:border-danger disabled:opacity-60"
    >
      <HeartIcon
        filled={inWishlist}
        className={`h-5 w-5 ${inWishlist ? "text-danger" : "text-ink-soft"}`}
      />
    </button>
  );
}
