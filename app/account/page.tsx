import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getAccount } from "@/lib/data";
import { ensureReferralCode } from "@/lib/referral";
import { formatPrice } from "@/lib/utils";
import { TIER_LABEL, TIER_DISCOUNT } from "@/lib/pricing";
import { FRESH_BOX_SIZES, weekdayLabel, nextDeliveryDate } from "@/lib/freshbox";
import { reconcileUserSubscriptions } from "@/lib/subscription";
import { ManageBillingButton } from "@/components/BillingButtons";
import { ReferralCard } from "@/components/ReferralCard";
import { REFERRAL_REWARD_CENTS } from "@/lib/orders";

export const metadata = { title: "Your account — Baskt" };

export default async function AccountPage(props: {
  searchParams: Promise<{ subscribed?: string; fresh?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const { subscribed, fresh } = await props.searchParams;

  // After returning from Stripe Checkout, pull the latest subscription state so
  // benefits reflect immediately even without a local webhook forwarder.
  if (subscribed || fresh) {
    await reconcileUserSubscriptions(userId).catch(() => {});
  }

  const code = await ensureReferralCode(userId);
  const [account, freshBox] = await Promise.all([
    getAccount(userId),
    prisma.freshBoxSubscription.findUnique({ where: { userId } }),
  ]);
  const tier = account.tier;
  const freshActive = freshBox && freshBox.status !== "canceled";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const referralLink = `${appUrl}/register?ref=${code}`;
  const discountPct = Math.round(TIER_DISCOUNT[tier] * 100);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Your account</h1>
      <p className="mt-1 text-stone-600">{account.user?.email}</p>

      {subscribed && (
        <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          🎉 Welcome to {TIER_LABEL[tier]}! Your member benefits are now active.
        </p>
      )}
      {fresh && (
        <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          🥬 Your Fresh Box subscription is set up — see the details below.
        </p>
      )}

      {/* Membership */}
      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Membership</h2>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
            {TIER_LABEL[tier]}
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-600">
          {tier === "PAYG"
            ? "You're on the free plan. Upgrade to save on every order and unlock free delivery."
            : `You get ${discountPct}% off every order${tier === "PLUS" ? " and free delivery, always" : ""}.`}
          {account.subscription?.currentPeriodEnd && (
            <>
              {" "}
              Renews{" "}
              {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
                account.subscription.currentPeriodEnd,
              )}
              .
            </>
          )}
        </p>
        <div className="mt-4">
          {tier === "PAYG" ? (
            <Link
              href="/membership"
              className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              View membership plans
            </Link>
          ) : (
            <ManageBillingButton />
          )}
        </div>
      </section>

      {/* Fresh Box */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fresh Produce Box</h2>
          {freshActive && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
              {FRESH_BOX_SIZES[freshBox!.size].label} · active
            </span>
          )}
        </div>
        {freshActive ? (
          <>
            <p className="mt-2 text-sm text-stone-600">
              Delivered on <strong>{weekdayLabel(freshBox!.deliveryWeekday)}s</strong>. Next
              delivery:{" "}
              {new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(
                nextDeliveryDate(freshBox!.deliveryWeekday, new Date()),
              )}
              .
            </p>
            <div className="mt-4">
              <ManageBillingButton />
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-stone-600">
              A monthly box of UK-farm-sourced seasonal produce and British beef. Pick a size
              and delivery day.
            </p>
            <Link
              href="/fresh"
              className="mt-4 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Subscribe to the Fresh Box
            </Link>
          </>
        )}
      </section>

      {/* Credit */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Account credit</h2>
        <p className="mt-2 text-3xl font-bold text-emerald-700">
          {formatPrice(account.user?.creditCents ?? 0)}
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Credit is applied automatically at checkout.
        </p>
      </section>

      {/* Referrals */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Refer friends, earn credit</h2>
        <p className="mt-2 text-sm text-stone-600">
          Share your link. When a friend places their first order, you both get{" "}
          <strong>{formatPrice(REFERRAL_REWARD_CENTS)}</strong> credit.
        </p>
        <div className="mt-4">
          <ReferralCard link={referralLink} />
        </div>
        <p className="mt-3 text-sm text-stone-500">
          Your code: <span className="font-mono font-semibold">{code}</span> ·{" "}
          {account.user?._count.referrals ?? 0} signed up so far
        </p>
      </section>
    </div>
  );
}
