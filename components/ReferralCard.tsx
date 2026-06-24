"use client";

import { useState } from "react";

export function ReferralCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // clipboard blocked — the field is selectable as a fallback
          }
        }}
        className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
