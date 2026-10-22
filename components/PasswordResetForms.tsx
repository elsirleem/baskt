"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordReset,
  resetPassword,
  type ResetPasswordState,
  type ResetRequestState,
} from "@/lib/actions/auth";
import { buttonClass, cardClass, inputClass } from "@/components/ui";

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

/** "Forgot password": asks for the email, then says a link is on its way. */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    undefined,
  );

  return (
    <div className="mx-auto max-w-sm pt-2 md:pt-8">
      <div className={`${cardClass} p-6`}>
        <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
        {state?.sent ? (
          <p role="status" className="mt-3 rounded-xl bg-brand-pale px-3 py-3 text-sm text-brand">
            If there&apos;s an account for that email, we&apos;ve sent a link to reset the
            password. It expires in 1 hour. Check your spam folder if it hasn&apos;t arrived in a
            few minutes.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              Enter the email you signed up with and we&apos;ll send you a link to choose a new one.
            </p>
            <form action={action} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-mid">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
              <FormError message={state?.error} />
              <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-sm text-ink-mid">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/** New password form for a valid reset link. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    undefined,
  );

  return (
    <div className="mx-auto max-w-sm pt-2 md:pt-8">
      <div className={`${cardClass} p-6`}>
        <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
        <p className="mt-1 text-sm text-ink-soft">
          You&apos;ll be signed out everywhere else, then asked to sign in with it.
        </p>
        <form action={action} className="mt-5 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-mid">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-ink-mid">
              Confirm new password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <FormError message={state?.error} />
          <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
            {pending ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
