import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/data";
import { weekdayLabel, FRESH_BOX_SIZES } from "@/lib/freshbox";
import { FreshBoxForm } from "@/components/FreshBoxForm";
import { buttonClass } from "@/components/ui";

export const metadata = {
  title: "Fresh Produce Box",
  description:
    "A monthly box of UK-farm-sourced seasonal fruit, veg, and British beef — delivered fresh.",
};

const PERKS = [
  {
    icon: "🌱",
    title: "UK-farm sourced",
    text: "Hampshire partners — full provenance, no air miles.",
  },
  {
    icon: "📅",
    title: "You pick the day",
    text: "Delivered Mon–Wed with a 24-hour freshness guarantee.",
  },
  {
    icon: "🔄",
    title: "Flexible",
    text: "Change size, skip, or cancel anytime — no commitment.",
  },
];

export default async function FreshPage() {
  const userId = await getCurrentUserId();
  const existing = userId
    ? await prisma.freshBoxSubscription.findUnique({ where: { userId } })
    : null;
  const active = existing && existing.status !== "canceled";

  return (
    <div className="mx-auto max-w-3xl">
      <section className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-linear-to-br from-fresh to-gold px-5 py-6 md:px-8 md:py-8">
        <div>
          <span className="inline-block rounded-full bg-white/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
            First in African grocery
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink md:text-3xl">
            The Fresh Produce Box
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-ink/80">
            A monthly box of UK-farm-sourced seasonal fruit, vegetables, and British beef cuts —
            sourced from Hampshire farm partners and delivered fresh to your door.
          </p>
        </div>
        <span className="hidden text-7xl sm:block" aria-hidden="true">
          🥬
        </span>
      </section>

      {active ? (
        <div className="rounded-2xl border-2 border-brand bg-brand-pale p-6">
          <h2 className="font-display text-lg font-bold text-brand">
            You&apos;re subscribed — {FRESH_BOX_SIZES[existing.size].label} box
          </h2>
          <p className="mt-2 text-sm text-ink-mid">
            Delivered on {weekdayLabel(existing.deliveryWeekday)}s. Manage or cancel anytime from
            your profile.
          </p>
          <Link href="/account" className={`${buttonClass.primary} mt-4`}>
            Go to profile
          </Link>
        </div>
      ) : (
        <FreshBoxForm signedIn={!!userId} />
      )}

      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {PERKS.map((perk) => (
          <li key={perk.title} className="rounded-2xl bg-white p-4 text-sm text-ink-mid shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
            <span className="text-xl" aria-hidden="true">
              {perk.icon}
            </span>
            <strong className="mt-1 block font-display text-ink">{perk.title}</strong>
            {perk.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
