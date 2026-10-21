"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addManyToCart } from "@/lib/actions/cart";
import { buttonClass } from "@/components/ui";

export function AddAllToCartButton({ productIds }: { productIds: string[] }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  if (productIds.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await addManyToCart(productIds);
            // If something couldn't be added, say so here instead of jumping away.
            if (result.ok && result.notice) setNotice(result.notice);
            else router.push("/cart");
          })
        }
        className={`${buttonClass.primary} w-full md:w-auto`}
      >
        {pending ? "Adding…" : `Add all ${productIds.length} to basket`}
      </button>
      {notice && (
        <p role="status" className="mt-2 text-sm text-gold-dark">
          {notice}{" "}
          <Link href="/cart" className="font-semibold text-brand hover:underline">
            View basket
          </Link>
        </p>
      )}
    </div>
  );
}
