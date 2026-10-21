"use client";

import { useTransition } from "react";
import { deleteProduct, setProductArchived } from "@/lib/actions/admin";

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
          startTransition(async () => {
            const result = await deleteProduct(id);
            if (result.error) alert(result.error);
          });
        }
      }}
      className="text-sm text-ink-soft hover:text-danger disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

/** Hides a product from the shop (or brings it back) without touching past orders. */
export function ArchiveProductButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setProductArchived(id, !archived))}
      className="text-sm font-semibold text-ink-mid hover:text-brand disabled:opacity-50"
    >
      {pending ? "Saving…" : archived ? "Restore" : "Archive"}
    </button>
  );
}
