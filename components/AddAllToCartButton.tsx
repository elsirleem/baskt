"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addManyToCart } from "@/lib/actions/cart";

export function AddAllToCartButton({ productIds }: { productIds: string[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (productIds.length === 0) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await addManyToCart(productIds);
          router.push("/cart");
        })
      }
      className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {pending ? "Adding…" : `Add all ${productIds.length} to basket`}
    </button>
  );
}
