import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getActiveOrder, getCurrentUserId, getAccount, getAccountStats } from "@/lib/data";
import { FULFILMENT_STEPS, stepIndex } from "@/lib/fulfilment";
import { ensureReferralCode } from "@/lib/referral";
import { formatPrice, formatWholePrice } from "@/lib/utils";
import { TIER_LABEL, TIER_DISCOUNT } from "@/lib/pricing";
import { FRESH_BOX_SIZES, weekdayLabel, nextDeliveryDate } from "@/lib/freshbox";
import { reconcileUserSubscriptions } from "@/lib/subscription";
import { REFERRAL_REWARD_CENTS } from "@/lib/orders";
import { logoutUser } from "@/lib/actions/auth";
import { ManageBillingButton } from "@/components/BillingButtons";
import { ReferralShareRow } from "@/components/ReferralCard";
import { ChevronRightIcon } from "@/components/icons";
import { listClass, rowClass } from "@/components/ui";
import { appUrl } from "@/lib/env";

export const metadata = { title: "Your profile" };

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2.5 px-1 text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
        {title}
      </h2>
      <div className={listClass}>{children}</div>
    </section>
  );
}

function RowLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className={rowClass}>
      <span className="w-7 text-center text-xl" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 text-sm text-ink">{label}</span>
      <ChevronRightIcon className="h-4 w-4 text-ink-soft" />
    </Link>
  );
}

function RowInfo({ icon, label, detail }: { icon: string; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="w-7 text-center text-xl" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 text-sm text-ink">{label}</span>
      <span className="text-sm font-semibold text-brand">{detail}</span>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
      <p className="font-display text-2xl font-black text-brand">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-soft">{label}</p>
    </div>
  );
}

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
  const [account, stats, freshBox, activeOrder] = await Promise.all([
    getAccount(userId),
    getAccountStats(userId),
    prisma.freshBoxSubscription.findUnique({ where: { userId } }),
    getActiveOrder(userId),
  ]);
  const { user, tier } = account;
  const freshActive = freshBox && freshBox.status !== "canceled";

  const referralLink = `${appUrl()}/register?ref=${code}`;
  const displayName = user?.name || user?.email || "";
  const renews =
    tier !== "PAYG" && account.subscription?.currentPeriodEnd
      ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
          account.subscription.currentPeriodEnd,
        )
      : null;

  return (
    <div className="mx-auto max-w-2xl">
      <section className="-mx-4 -mt-2 bg-white px-5 pb-5 pt-4 md:mx-0 md:mt-0 md:rounded-2xl md:p-6 md:shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        <div className="mb-4 flex items-center gap-3.5">
          <div
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-brand font-display text-[26px] font-bold text-white"
            aria-hidden="true"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-bold">{displayName}</h1>
            <p className="truncate text-[13px] text-ink-soft">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-linear-to-br from-brand to-brand-dark px-5 py-4">
          <div>
            <p className="text-[11px] text-white/70">Current plan</p>
            <p className="font-display text-[17px] font-bold text-white">
              {TIER_LABEL[tier]}
              {tier === "PLUS" && " ⭐"}
            </p>
            <p className="text-[11px] text-white/70">
              {tier === "PAYG"
                ? "Upgrade to save on every order"
                : renews
                  ? `${Math.round(TIER_DISCOUNT[tier] * 100)}% off every order · Renews ${renews}`
                  : `${Math.round(TIER_DISCOUNT[tier] * 100)}% off every order`}
            </p>
          </div>
          {tier === "PAYG" ? (
            <Link
              href="/membership"
              className="shrink-0 rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-ink transition hover:brightness-105"
            >
              Upgrade
            </Link>
          ) : (
            <span className="shrink-0 rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-ink">
              Active
            </span>
          )}
        </div>
      </section>

      {subscribed && (
        <p className="mt-4 rounded-xl bg-brand-pale px-4 py-3 text-sm text-brand">
          🎉 Welcome to {TIER_LABEL[tier]}! Your member benefits are now active.
        </p>
      )}
      {fresh && (
        <p className="mt-4 rounded-xl bg-brand-pale px-4 py-3 text-sm text-brand">
          🥬 Your Fresh Box subscription is set up — see the details below.
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat value={stats.orderCount} label="Orders" />
        <Stat value={formatWholePrice(stats.savedCents)} label="Saved" />
        <Stat value={user?._count.referrals ?? 0} label="Referrals" />
      </div>

      <ProfileSection title="Orders & Wishlist">
        {activeOrder && (
          <RowLink
            href={`/orders#order-${activeOrder.id}`}
            icon="🚚"
            label={`Track your order · ${FULFILMENT_STEPS[stepIndex(activeOrder.fulfilment)].customerLabel}`}
          />
        )}
        <RowLink href="/orders" icon="📦" label="Order history" />
        <RowLink href="/wishlist" icon="🤍" label="Wishlist" />
      </ProfileSection>

      <ProfileSection title="Fresh Produce">
        {freshActive ? (
          <>
            <ManageBillingButton
              variant="row"
              icon="🥬"
              label={`Manage monthly box · ${FRESH_BOX_SIZES[freshBox.size].label}`}
            />
            <RowInfo
              icon="🗓️"
              label={`Next box: ${new Intl.DateTimeFormat("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(nextDeliveryDate(freshBox.deliveryWeekday, new Date()))}`}
              detail={`${weekdayLabel(freshBox.deliveryWeekday)}s`}
            />
          </>
        ) : (
          <RowLink href="/fresh" icon="🥬" label="Subscribe to the Fresh Box" />
        )}
      </ProfileSection>

      <ProfileSection title="Account">
        {tier === "PAYG" ? (
          <RowLink href="/membership" icon="⭐" label="My subscription" />
        ) : (
          <ManageBillingButton variant="row" icon="⭐" label="My subscription" />
        )}
        <ReferralShareRow link={referralLink} rewardLabel={formatWholePrice(REFERRAL_REWARD_CENTS)} />
        <RowInfo icon="💷" label="Account credit" detail={formatPrice(user?.creditCents ?? 0)} />
        <RowLink href="/account/settings" icon="⚙️" label="Settings" />
        {user?.isAdmin && <RowLink href="/admin" icon="🛠️" label="Admin" />}
        <form action={logoutUser}>
          <button type="submit" className={rowClass}>
            <span className="w-7 text-center text-xl" aria-hidden="true">
              👋
            </span>
            <span className="flex-1 text-sm font-medium text-danger">Sign out</span>
          </button>
        </form>
      </ProfileSection>

      <p className="mt-3 px-1 text-xs text-ink-soft">
        Your referral code is <span className="font-mono font-semibold text-ink">{code}</span>.
        When a friend signs up with your link and places their first order, you both get{" "}
        {formatWholePrice(REFERRAL_REWARD_CENTS)} credit. Credit is applied automatically at checkout.
      </p>
    </div>
  );
}
