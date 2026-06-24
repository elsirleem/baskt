"use client";

import { useTransition } from "react";
import { deleteProduct } from "@/lib/actions/admin";

export function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${name}"? This cannot be undone.`)) {
          startTransition(() => deleteProduct(id));
        }
      }}
      className="text-sm text-stone-500 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
