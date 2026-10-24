"use client";

import { useActionState } from "react";
import {
  confirmEmail,
  resendConfirmation,
  type FormState,
  type ResendState,
} from "@/lib/actions/auth";
import { buttonClass, cardClass, inputClass } from "@/components/ui";

/** Shown after signing up: the account appears once the emailed link is used. */
export function CheckInbox({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ResendState, FormData>(
    resendConfirmation,
    undefined,
  );

  return (
    <div className="mx-auto max-w-sm pt-2 md:pt-8">
      <div className={`${cardClass} p-6 text-center`}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-pale text-3xl">
          📬
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Check your inbox</h1>
        <p className="mt-2 text-sm text-ink-mid">
          We&apos;ve sent a link to <strong className="break-all text-ink">{email}</strong>. Open
          it to finish creating your account. It expires in 24 hours.
        </p>

        {state?.sent ? (
          <p role="status" className="mt-5 rounded-xl bg-brand-pale px-3 py-2 text-sm text-brand">
            We&apos;ve sent another link. Use the newest email.
          </p>
        ) : (
          <form action={action} className="mt-5">
            <input type="hidden" name="email" value={email} />
            {state?.error && (
              <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            )}
            <p className="text-xs text-ink-soft">Can&apos;t find it? Check your spam folder, or</p>
            <button type="submit" disabled={pending} className={`${buttonClass.outline} mt-2 w-full`}>
              {pending ? "Sending…" : "Send it again"}
            </button>
          </form>
        )}
      </div>
      <p className="mt-4 text-center text-sm text-ink-mid">
        Wrong email?{" "}
        {/* A full page load, so the sign-up form starts empty. */}
        <a href="/register" className="font-semibold text-brand hover:underline">
          Start again
        </a>
      </p>
    </div>
  );
}

/**
 * The emailed link's page. Asking for the password means only the person who
 * signed up can create the account, and it signs them straight in.
 */
export function ConfirmEmailForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(confirmEmail, undefined);

  return (
    <div className="mx-auto max-w-sm pt-2 md:pt-8">
      <div className={`${cardClass} p-6`}>
        <h1 className="font-display text-2xl font-bold">Confirm your email</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Enter the password you chose to finish creating your account.
        </p>
        <form action={action} className="mt-5 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-mid">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              readOnly
              autoComplete="username"
              className={`${inputClass} bg-cream text-ink-mid`}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-mid">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
          {state?.error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
            {pending ? "Please wait…" : "Confirm and sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
