"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/lib/actions/auth";
import { buttonClass, cardClass, inputClass } from "@/components/ui";
import { CheckInbox } from "@/components/SignupConfirmation";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function AuthForm({
  mode,
  action,
  refCode,
  notice,
}: {
  mode: "login" | "register";
  action: Action;
  refCode?: string;
  /** A short success message above the form, e.g. after a password reset. */
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  const isRegister = mode === "register";
  if (state?.confirmEmail) return <CheckInbox email={state.confirmEmail} />;

  return (
    <div className="mx-auto max-w-sm pt-2 md:pt-8">
      <div className={`${cardClass} p-6`}>
        <h1 className="font-display text-2xl font-bold">
          {isRegister ? "Create your account" : "Welcome back 👋"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {isRegister
            ? "Join AfroPantry for African essentials delivered across the UK."
            : "Sign in to your AfroPantry account."}
        </p>

        {notice && (
          <p role="status" className="mt-4 rounded-xl bg-brand-pale px-3 py-2 text-sm text-brand">
            {notice}
          </p>
        )}

        {isRegister && refCode && (
          <p className="mt-4 rounded-xl bg-gold-light px-3 py-2 text-sm text-gold-dark">
            🎁 You were referred! You&apos;ll both get £5 credit after your first order.
          </p>
        )}

        <form action={formAction} className="mt-5 space-y-4">
          {isRegister && refCode && <input type="hidden" name="ref" value={refCode} />}
          {isRegister && (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink-mid">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className={inputClass}
              />
            </div>
          )}

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

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-mid">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className={inputClass}
            />
            {isRegister ? (
              <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>
            ) : (
              <Link
                href="/forgot-password"
                className="mt-1.5 inline-block text-xs font-semibold text-brand hover:underline"
              >
                Forgot your password?
              </Link>
            )}
          </div>

          {state?.error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
            {pending ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-ink-mid">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
