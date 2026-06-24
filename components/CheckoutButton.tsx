"use client";

import { useState } from "react";

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }
      // Redirect to Stripe's hosted checkout page.
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="w-full rounded-md bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Redirecting to secure checkout…" : "Checkout securely"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
