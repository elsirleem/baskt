"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Build your box</h2>

      <p className="mt-4 text-sm font-medium text-stone-700">Choose a size</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {SIZES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSize(s.key)}
            className={`rounded-lg border p-4 text-left transition ${
              size === s.key
                ? "border-emerald-600 ring-1 ring-emerald-600"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{s.label}</span>
              <span className="text-sm font-semibold text-emerald-700">{s.price}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">{s.blurb}</p>
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm font-medium text-stone-700">
        Preferred delivery day{" "}
        <span className="font-normal text-stone-400">(we deliver Mon–Wed)</span>
      </p>
      <div className="mt-2 flex gap-2">
        {DAYS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => setWeekday(d.value)}
            className={`rounded-md border px-4 py-2 text-sm ${
              weekday === d.value
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-stone-300 text-stone-700 hover:bg-stone-50"
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
        className="mt-6 w-full rounded-md bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading
          ? "Redirecting…"
          : signedIn
            ? "Subscribe to the fresh box"
            : "Sign in to subscribe"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-center text-xs text-stone-400">
        Monthly subscription billed securely by Stripe. Cancel anytime.
      </p>
    </div>
  );
}
