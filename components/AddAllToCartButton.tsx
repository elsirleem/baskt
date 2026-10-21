"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addManyToCart } from "@/lib/actions/cart";
import { buttonClass } from "@/components/ui";

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
      className={`${buttonClass.primary} w-full md:w-auto`}
    >
      {pending ? "Adding…" : `Add all ${productIds.length} to basket`}
    </button>
  );
}
