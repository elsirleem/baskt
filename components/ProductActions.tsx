"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/actions/cart";
import { toggleWishlist } from "@/lib/actions/wishlist";
import { formatPrice } from "@/lib/utils";
import { buttonClass } from "@/components/ui";
import { HeartIcon } from "@/components/icons";

const MAX_QUANTITY = 99;

/**
 * Adds to the basket, then shows a tick for a moment, or a short message when
 * stock got in the way (sold out, or fewer added than asked).
 */
function useAdd(productId: string) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const add = (quantity = 1) =>
    startTransition(async () => {
      const result = await addToCart(productId, quantity);
      const note = result.ok ? result.notice : result.error;
      setMessage(note ?? null);
      if (note) setTimeout(() => setMessage(null), 4000);
      if (result.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }
    });

  return { pending, added, message, add };
}

/** Small dark bubble above a compact button, announced to screen readers. */
function Bubble({ message }: { message: string | null }) {
  return (
    <p
      role="status"
      className={
        message
          ? "absolute bottom-full right-0 z-10 mb-2 w-48 rounded-lg bg-ink px-2.5 py-1.5 text-left text-[11px] leading-snug text-white shadow-lg"
          : "sr-only"
      }
    >
      {message}
    </p>
  );
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
  const { pending, added, message, add } = useAdd(productId);

  if (variant === "pill") {
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          disabled={pending || disabled}
          onClick={() => add()}
          aria-label={`Add ${productName} to basket`}
          className={buttonClass.soft}
        >
          {disabled ? "Sold out" : added ? "✓ Added" : pending ? "Adding…" : "+ Add"}
        </button>
        <Bubble message={message} />
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => add()}
        aria-label={disabled ? `${productName} is out of stock` : `Add ${productName} to basket`}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-lg font-light leading-none text-white transition hover:bg-brand-light disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft"
      >
        {added ? "✓" : pending ? "…" : "+"}
      </button>
      <Bubble message={message} />
    </div>
  );
}

/** Quantity picker plus a full-width "Add to Basket — £x" button for the product page. */
export function AddWithQuantity({
  productId,
  priceCents,
  currency,
  stock,
}: {
  productId: string;
  priceCents: number;
  currency: string;
  stock: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const { pending, added, message, add } = useAdd(productId);
  const disabled = stock <= 0;
  const max = Math.max(1, Math.min(MAX_QUANTITY, stock));

  const change = (delta: number) => setQuantity((q) => Math.min(Math.max(q + delta, 1), max));

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
            disabled={quantity >= max}
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
      <p role="status" className={message ? "mt-2 text-sm font-medium text-gold-dark" : "sr-only"}>
        {message}
      </p>
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
