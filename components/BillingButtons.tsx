"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, rowClass } from "@/components/ui";
import { ChevronRightIcon } from "@/components/icons";

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
        className={`${variant === "primary" ? buttonClass.primary : buttonClass.outline} w-full`}
      >
        {loading ? "Redirecting…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Opens the Stripe Billing Portal. Renders as a button, or as a Profile menu row. */
export function ManageBillingButton({
  label = "Manage subscription",
  variant = "button",
  icon,
}: {
  label?: string;
  variant?: "button" | "row";
  icon?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setLoading(true);
    setError(null);
    try {
      window.location.href = await postForRedirect("/api/subscription/portal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  };

  if (variant === "row") {
    return (
      <div>
        <button type="button" disabled={loading} onClick={open} className={rowClass}>
          <span className="w-7 text-center text-xl" aria-hidden="true">
            {icon}
          </span>
          <span className="flex-1 text-sm text-ink">{loading ? "Opening…" : label}</span>
          <ChevronRightIcon className="h-4 w-4 text-ink-soft" />
        </button>
        {error && <p className="px-4 pb-3 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={open}
        className={`${buttonClass.outline} w-full`}
      >
        {loading ? "Opening…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
