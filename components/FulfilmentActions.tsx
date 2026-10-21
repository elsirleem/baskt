"use client";

import { useActionState } from "react";
import type { FulfilmentStatus } from "@prisma/client";
import { updateFulfilment, type FulfilmentFormState } from "@/lib/actions/admin";
import { CARRIERS, canMoveTo } from "@/lib/fulfilment";
import { buttonClass, inputClass } from "@/components/ui";

/** The admin's next steps for a paid order: mark packed, shipped (with carrier), delivered. */
export function FulfilmentActions({
  orderId,
  status,
}: {
  orderId: string;
  status: FulfilmentStatus;
}) {
  const [state, action, pending] = useActionState<FulfilmentFormState, FormData>(
    updateFulfilment,
    undefined,
  );

  if (status === "DELIVERED") {
    return <p className="text-sm text-ink-soft">Delivered. Nothing left to do.</p>;
  }

  return (
    <div className="space-y-3">
      {canMoveTo(status, "PACKED") && (
        <form action={action}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="next" value="PACKED" />
          <button type="submit" disabled={pending} className={`${buttonClass.outline} w-full`}>
            Mark as packed
          </button>
        </form>
      )}

      {canMoveTo(status, "SHIPPED") && (
        <form action={action} className="space-y-3 rounded-xl border border-line p-3">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="next" value="SHIPPED" />
          <div>
            <label htmlFor="carrier" className="mb-1.5 block text-sm font-medium text-ink-mid">
              Delivered by
            </label>
            <select id="carrier" name="carrier" required defaultValue="Royal Mail" className={inputClass}>
              {CARRIERS.map((carrier) => (
                <option key={carrier}>{carrier}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="trackingNumber" className="mb-1.5 block text-sm font-medium text-ink-mid">
              Tracking number <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <input id="trackingNumber" name="trackingNumber" maxLength={60} className={inputClass} />
          </div>
          <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
            Mark as shipped
          </button>
        </form>
      )}

      {status === "SHIPPED" && (
        <form action={action}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="next" value="DELIVERED" />
          <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
            Mark as delivered
          </button>
        </form>
      )}

      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
