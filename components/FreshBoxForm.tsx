"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, cardClass } from "@/components/ui";

type Size = "SMALL" | "MEDIUM" | "LARGE";

const SIZES: { key: Size; label: string; price: string; blurb: string }[] = [
  { key: "SMALL", label: "Small", price: "£25/mo", blurb: "Seasonal fruit & veg for 1–2 people." },
  { key: "MEDIUM", label: "Medium", price: "£32/mo", blurb: "Fruit, veg & British beef cuts for a family." },
  { key: "LARGE", label: "Large", price: "£40/mo", blurb: "Generous produce & premium cuts." },
];

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
];

export function FreshBoxForm({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [size, setSize] = useState<Size>("MEDIUM");
  const [weekday, setWeekday] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fresh/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, weekday }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className={`${cardClass} p-5 md:p-6`}>
      <h2 className="font-display text-lg font-bold">Build your box</h2>

      <p className="mt-4 text-sm font-medium text-ink-mid">Choose a size</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Box size">
        {SIZES.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={size === s.key}
            onClick={() => setSize(s.key)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              size === s.key ? "border-brand bg-brand-pale" : "border-line hover:border-brand/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{s.label}</span>
              <span className="font-display text-sm font-bold text-brand">{s.price}</span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">{s.blurb}</p>
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm font-medium text-ink-mid">
        Preferred delivery day{" "}
        <span className="font-normal text-ink-soft">(we deliver Mon–Wed)</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Delivery day">
        {DAYS.map((d) => (
          <button
            key={d.value}
            type="button"
            role="radio"
            aria-checked={weekday === d.value}
            onClick={() => setWeekday(d.value)}
            className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${
              weekday === d.value
                ? "border-brand bg-brand-pale text-brand"
                : "border-line text-ink-mid hover:border-brand/40"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={subscribe}
        disabled={loading}
        className={`${buttonClass.primary} mt-6 w-full py-4 text-base`}
      >
        {loading
          ? "Redirecting…"
          : signedIn
            ? "Subscribe to the Fresh Box"
            : "Sign in to subscribe"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <p className="mt-3 text-center text-xs text-ink-soft">
        Monthly subscription billed securely by Stripe. Cancel anytime.
      </p>
    </div>
  );
}
