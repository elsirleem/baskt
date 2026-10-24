"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { moveToCart } from "@/lib/actions/cart";
import { removeFromWishlist, shareWishlist, stopSharingWishlist } from "@/lib/actions/wishlist";
import { buttonClass, cardClass, inputClass } from "@/components/ui";

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

/** Phones offer their own share sheet (WhatsApp, Messages…); desktops mostly don't. */
const subscribeToNothing = () => () => {};
function useCanShare() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => typeof navigator.share === "function",
    () => false,
  );
}

/** Turns the wishlist's private share link on and off, and copies or shares it. */
export function ShareWishlist({ shareUrl }: { shareUrl: string | null }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const canShare = useCanShare();

  if (!shareUrl) {
    return (
      <section className={`${cardClass} mb-4 p-4`}>
        <h2 className="font-display text-base font-bold">Share your wishlist</h2>
        <p className="mt-1 text-sm text-ink-mid">
          Get a private link so friends and family can see what you&apos;d like. Only people
          with the link can open it, and you can turn it off at any time.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => shareWishlist())}
          className={`${buttonClass.outline} mt-3`}
        >
          {pending ? "Creating link…" : "Create a share link"}
        </button>
      </section>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // No clipboard access: select the link so it can be copied by hand.
      (document.getElementById("share-link") as HTMLInputElement | null)?.select();
    }
  }

  return (
    <section className={`${cardClass} mb-4 p-4`}>
      <h2 className="font-display text-base font-bold">Your wishlist is shared</h2>
      <p className="mt-1 text-sm text-ink-mid">
        Anyone with this link can see the products on your wishlist, and nothing else about
        your account.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          id="share-link"
          readOnly
          value={shareUrl}
          aria-label="Share link"
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClass} min-w-0 flex-1 bg-cream py-2.5 text-sm text-ink-mid`}
        />
        <button type="button" onClick={copy} className={`${buttonClass.outline} shrink-0`}>
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4">
        {canShare && (
          <button
            type="button"
            onClick={() =>
              navigator.share({ title: "My AfroPantry wishlist", url: shareUrl }).catch(() => {})
            }
            className={buttonClass.soft}
          >
            Share…
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => stopSharingWishlist())}
          className="text-xs font-medium text-ink-soft hover:text-danger disabled:opacity-50"
        >
          {pending ? "Turning off…" : "Stop sharing"}
        </button>
      </div>
    </section>
  );
}
