"use client";

import { useState } from "react";
import { rowClass } from "@/components/ui";

/** Profile row that shares the referral link (native share sheet, or copy as a fallback). */
export function ReferralShareRow({ link, rewardLabel }: { link: string; rewardLabel: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `Get African essentials delivered with AfroPantry — we both get ${rewardLabel} credit when you place your first order.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "AfroPantry", text, url: link });
        return;
      } catch {
        // Share sheet dismissed or unavailable — fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the link is also shown under the row.
    }
  };

  return (
    <button type="button" onClick={share} className={rowClass}>
      <span className="w-7 text-center text-xl" aria-hidden="true">
        👥
      </span>
      <span className="flex-1 text-sm text-ink">Refer a friend — earn {rewardLabel}</span>
      <span className="text-xs font-bold text-gold-dark">{copied ? "Link copied!" : "Share"}</span>
    </button>
  );
}
