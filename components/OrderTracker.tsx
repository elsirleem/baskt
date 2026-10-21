import type { FulfilmentStatus } from "@prisma/client";
import { FULFILMENT_STEPS, stepIndex } from "@/lib/fulfilment";

const shortDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/London",
});

/** Four-step progress line for a paid order, with the date each step happened. */
export function OrderTracker({
  status,
  times,
  audience = "customer",
}: {
  status: FulfilmentStatus;
  times: Record<FulfilmentStatus, Date | null>;
  audience?: "customer" | "admin";
}) {
  const current = stepIndex(status);
  const last = FULFILMENT_STEPS.length - 1;

  return (
    <ol className="grid grid-cols-4" aria-label="Delivery progress">
      {FULFILMENT_STEPS.map((step, i) => {
        const done = i <= current;
        const when = times[step.status];
        return (
          <li
            key={step.status}
            aria-current={i === current ? "step" : undefined}
            className="flex flex-col items-center text-center"
          >
            <div className="flex w-full items-center" aria-hidden="true">
              <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : done ? "bg-brand" : "bg-line"}`} />
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done ? "bg-brand text-white" : "bg-line text-ink-soft"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`h-0.5 flex-1 ${i === last ? "invisible" : i < current ? "bg-brand" : "bg-line"}`}
              />
            </div>
            <span
              className={`mt-1 text-[11px] leading-tight ${
                i === current ? "font-semibold text-brand" : done ? "text-ink-mid" : "text-ink-soft"
              }`}
            >
              {audience === "admin" ? step.adminLabel : step.customerLabel}
            </span>
            {when && <span className="text-[10px] text-ink-soft">{shortDate.format(when)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** The timestamp for each step, from an order's columns. */
export function trackerTimes(order: {
  paidAt: Date | null;
  packedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}): Record<FulfilmentStatus, Date | null> {
  return {
    UNFULFILLED: order.paidAt,
    PACKED: order.packedAt,
    SHIPPED: order.shippedAt,
    DELIVERED: order.deliveredAt,
  };
}
