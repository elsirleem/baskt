"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function postForRedirect(url: string, body?: unknown): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong.");
  return data.url as string;
}

export function SubscribeButton({
  tier,
  label,
  variant = "primary",
}: {
  tier: "MONTHLY" | "PLUS";
  label: string;
  variant?: "primary" | "secondary";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const base =
    variant === "primary"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : "border border-emerald-600 text-emerald-700 hover:bg-emerald-50";

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            window.location.href = await postForRedirect("/api/subscription/checkout", {
              tier,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Something went wrong.";
            // Not signed in → send to login.
            if (msg.toLowerCase().includes("authenticated")) {
              router.push("/login");
              return;
            }
            setError(msg);
            setLoading(false);
          }
        }}
        className={`w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${base}`}
      >
        {loading ? "Redirecting…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            window.location.href = await postForRedirect("/api/subscription/portal");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
            setLoading(false);
          }
        }}
        className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
      >
        {loading ? "Opening…" : "Manage subscription"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
