import type { FulfilmentStatus } from "@prisma/client";

/** The packing and delivery steps a paid order goes through, in order. */
export const FULFILMENT_STEPS: {
  status: FulfilmentStatus;
  adminLabel: string;
  customerLabel: string;
}[] = [
  { status: "UNFULFILLED", adminLabel: "To pack", customerLabel: "Order received" },
  { status: "PACKED", adminLabel: "Packed", customerLabel: "Packed" },
  { status: "SHIPPED", adminLabel: "Shipped", customerLabel: "On its way" },
  { status: "DELIVERED", adminLabel: "Delivered", customerLabel: "Delivered" },
];

export function stepIndex(status: FulfilmentStatus): number {
  return FULFILMENT_STEPS.findIndex((step) => step.status === status);
}

/** Orders only move forward; skipping a step (e.g. straight to shipped) is fine. */
export function canMoveTo(current: FulfilmentStatus, next: FulfilmentStatus): boolean {
  return stepIndex(next) > stepIndex(current);
}

export const CARRIERS = ["Royal Mail", "DPD", "DHL", "Evri", "Own delivery"] as const;
