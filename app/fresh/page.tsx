import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/data";
import { weekdayLabel, FRESH_BOX_SIZES } from "@/lib/freshbox";
import { FreshBoxForm } from "@/components/FreshBoxForm";

export const metadata = {
  title: "Fresh Produce Box — Baskt",
  description:
    "A monthly box of UK-farm-sourced seasonal fruit, veg, and British beef — delivered fresh.",
};

export default async function FreshPage() {
  const userId = await getCurrentUserId();
  const existing = userId
    ? await prisma.freshBoxSubscription.findUnique({ where: { userId } })
    : null;
  const active = existing && existing.status !== "canceled";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          First in African grocery
        </span>
        <h1 className="mt-3 text-3xl font-bold">The Baskt Fresh Box</h1>
        <p className="mt-2 text-stone-600">
          A monthly box of UK-farm-sourced seasonal fruit, vegetables, and British beef cuts —
          sourced from Hampshire farm partners and delivered fresh to your door.
        </p>
      </div>

      {active ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">
            You&apos;re subscribed — {FRESH_BOX_SIZES[existing!.size].label} box
          </h2>
          <p className="mt-2 text-sm text-emerald-800">
            Delivered on {weekdayLabel(existing!.deliveryWeekday)}s. Manage or cancel anytime
            from your account.
          </p>
          <Link
            href="/account"
            className="mt-4 inline-block rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to account
          </Link>
        </div>
      ) : (
        <FreshBoxForm signedIn={!!userId} />
      )}

      <ul className="mt-8 grid gap-4 text-sm text-stone-600 sm:grid-cols-3">
        <li className="rounded-lg border border-stone-200 bg-white p-4">
          🌱 <strong className="block text-stone-900">UK-farm sourced</strong>
          Hampshire partners — full provenance, no air miles.
        </li>
        <li className="rounded-lg border border-stone-200 bg-white p-4">
          📅 <strong className="block text-stone-900">You pick the day</strong>
          Delivered Mon–Wed with a 24-hour freshness guarantee.
        </li>
        <li className="rounded-lg border border-stone-200 bg-white p-4">
          🔄 <strong className="block text-stone-900">Flexible</strong>
          Change size, skip, or cancel anytime — no commitment.
        </li>
      </ul>
    </div>
  );
}
