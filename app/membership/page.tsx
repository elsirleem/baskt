import Link from "next/link";
import { getCurrentUserId, getUserTier } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { SubscribeButton, ManageBillingButton } from "@/components/BillingButtons";
import { PageTitle, buttonClass } from "@/components/ui";

export const metadata = { title: "Plans" };

const MONTHLY_CENTS = 499;
const PLUS_YEARLY_CENTS = 3999;

const TIERS = [
  {
    key: "PAYG" as const,
    name: "Pay As You Go",
    price: "Free",
    period: "No commitment",
    perks: [
      "Free delivery on orders over £70",
      "Full product catalogue",
      "In-app recipes",
    ],
    cta: null,
  },
  {
    key: "MONTHLY" as const,
    name: "AfroBasic",
    price: formatPrice(MONTHLY_CENTS),
    period: "per month · billed monthly",
    perks: [
      "5% off all orders",
      "Priority dispatch",
      "Free delivery on orders over £70",
      "Everything in Pay As You Go",
    ],
    cta: { tier: "MONTHLY" as const, label: "Select monthly", variant: "secondary" as const },
  },
  {
    key: "PLUS" as const,
    name: "AfroPlus ⭐",
    price: formatPrice(PLUS_YEARLY_CENTS),
    period: `per year · saves ${formatPrice(MONTHLY_CENTS * 12 - PLUS_YEARLY_CENTS)} vs monthly`,
    highlight: true,
    perks: [
      "10% off ALL orders",
      "Free delivery on every order",
      "Premium recipe library",
      "Personal shopper",
    ],
    cta: {
      tier: "PLUS" as const,
      label: `Get AfroPlus — ${formatPrice(PLUS_YEARLY_CENTS)}/yr`,
      variant: "primary" as const,
    },
  },
];

export default async function MembershipPage() {
  const userId = await getCurrentUserId();
  const currentTier = userId ? await getUserTier(userId) : "PAYG";

  return (
    <div>
      <PageTitle subtitle="Save more, get more. Cancel any time.">Choose Your Plan ⭐</PageTitle>

      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.key;
          return (
            <div
              key={tier.key}
              className={`flex flex-col rounded-2xl border-2 p-5 ${
                tier.highlight ? "border-brand bg-brand-pale" : "border-line bg-white"
              }`}
            >
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <h2 className="font-display text-[17px] font-bold text-ink">{tier.name}</h2>
                {tier.highlight && (
                  <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    Best value
                  </span>
                )}
              </div>
              <p
                className={`font-display text-[28px] font-black leading-tight ${
                  tier.key === "PAYG" ? "text-ink-mid" : "text-brand"
                }`}
              >
                {tier.price}
              </p>
              <p className="mb-3 text-xs text-ink-soft">{tier.period}</p>

              <ul className="flex-1 space-y-1.5">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-[13px] text-ink-mid">
                    <span className="text-[15px] font-bold text-brand" aria-hidden="true">
                      ✓
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                {isCurrent ? (
                  tier.key === "PAYG" ? (
                    <p className="rounded-xl border-2 border-line py-3 text-center text-sm font-semibold text-ink-soft">
                      Current plan
                    </p>
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
                      className={`${
                        tier.cta.variant === "primary" ? buttonClass.primary : buttonClass.outline
                      } w-full`}
                    >
                      Sign in to subscribe
                    </Link>
                  )
                ) : (
                  <p className="py-3 text-center text-xs text-ink-soft">
                    Cancel your plan any time to switch back.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Billing is handled securely by Stripe. Cancel anytime from your profile.
      </p>
    </div>
  );
}
