import Link from "next/link";
import { getCurrentUserId, getUserTier } from "@/lib/data";
import { TIER_LABEL } from "@/lib/pricing";
import { SubscribeButton, ManageBillingButton } from "@/components/BillingButtons";

export const metadata = { title: "Membership — Baskt" };

const TIERS = [
  {
    key: "PAYG" as const,
    name: "Pay as you go",
    price: "Free",
    cadence: "",
    perks: [
      "Browse the full catalogue",
      "Free delivery on orders over £70",
      "In-app recipes",
    ],
    cta: null,
  },
  {
    key: "MONTHLY" as const,
    name: "Baskt Monthly",
    price: "£4.99",
    cadence: "/month",
    perks: [
      "5% off every order",
      "Priority dispatch",
      "Free delivery over £70",
      "Everything in Pay as you go",
    ],
    cta: { tier: "MONTHLY" as const, label: "Subscribe monthly", variant: "secondary" as const },
  },
  {
    key: "PLUS" as const,
    name: "Baskt Plus",
    price: "£39.99",
    cadence: "/year",
    highlight: true,
    perks: [
      "10% off every order",
      "Free delivery — always, no minimum",
      "Premium recipe library",
      "Personal shopper",
    ],
    cta: { tier: "PLUS" as const, label: "Go Plus — best value", variant: "primary" as const },
  },
];

export default async function MembershipPage() {
  const userId = await getCurrentUserId();
  const currentTier = userId ? await getUserTier(userId) : "PAYG";

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Become a member</h1>
        <p className="mt-2 text-stone-600">
          Save on every order, unlock free delivery, and cook more with premium recipes.
        </p>
        {userId && (
          <p className="mt-2 text-sm text-stone-500">
            Your current plan: <strong>{TIER_LABEL[currentTier]}</strong>
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.key;
          return (
            <div
              key={tier.key}
              className={`flex flex-col rounded-xl border bg-white p-6 ${
                tier.highlight ? "border-emerald-600 ring-1 ring-emerald-600" : "border-stone-200"
              }`}
            >
              {tier.highlight && (
                <span className="mb-2 self-start rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold">{tier.name}</h2>
              <p className="mt-2">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-stone-500">{tier.cadence}</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-stone-600">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  tier.key === "PAYG" ? (
                    <p className="text-center text-sm text-stone-500">Your current plan</p>
                  ) : (
                    <ManageBillingButton />
                  )
                ) : tier.cta ? (
                  userId ? (
                    <SubscribeButton
                      tier={tier.cta.tier}
                      label={tier.cta.label}
                      variant={tier.cta.variant}
                    />
                  ) : (
                    <Link
                      href="/login"
                      className="block w-full rounded-md bg-emerald-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Sign in to subscribe
                    </Link>
                  )
                ) : (
                  <p className="text-center text-sm text-stone-400">No commitment</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-stone-400">
        Billing is handled securely by Stripe. Cancel anytime from your account.
      </p>
    </div>
  );
}
