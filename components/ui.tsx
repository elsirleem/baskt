import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/icons";

/** Shared looks so every page matches the prototype. */
export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-60",
  outline:
    "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand px-5 py-3 text-sm font-semibold text-brand transition hover:bg-brand-pale disabled:cursor-not-allowed disabled:opacity-60",
  soft: "inline-flex items-center justify-center gap-1 rounded-lg bg-brand-pale px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-60",
};

export const cardClass = "rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]";

/** Grouped settings-style list (Profile menu) and its rows. */
export const listClass =
  "divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)]";
export const rowClass =
  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-cream disabled:opacity-60";

export const inputClass =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-4 py-3 text-[15px] outline-none transition placeholder:text-ink-soft focus:border-brand";

export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-5 md:mb-8">
      <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">{children}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-soft md:text-base">{subtitle}</p>}
    </div>
  );
}

export function SectionHeader({
  title,
  href,
  linkLabel = "See all",
}: {
  title: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-[17px] font-bold text-ink md:text-xl">{title}</h2>
      {href && (
        <Link href={href} className="text-[13px] font-semibold text-brand hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/** Small "← Profile" style link above a page title. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}

/** Round back button that floats over hero images. */
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition hover:bg-cream"
    >
      <ArrowLeftIcon className="h-5 w-5" />
    </Link>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  cta,
}: {
  icon: string;
  title: string;
  text: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="py-16 text-center">
      <div className="text-5xl">{icon}</div>
      <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-ink-soft">{text}</p>
      {cta && (
        <Link href={cta.href} className={`${buttonClass.primary} mt-6`}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
