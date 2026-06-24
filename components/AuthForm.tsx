"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/lib/actions/auth";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function AuthForm({
  mode,
  action,
  refCode,
}: {
  mode: "login" | "register";
  action: Action;
  refCode?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  const isRegister = mode === "register";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>

      {isRegister && refCode && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          🎁 You were referred! You&apos;ll both get £5 credit after your first order.
        </p>
      )}

      <form action={formAction} className="space-y-4">
        {isRegister && refCode && <input type="hidden" name="ref" value={refCode} />}
        {isRegister && (
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
          {isRegister && (
            <p className="mt-1 text-xs text-stone-500">At least 8 characters.</p>
          )}
        </div>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending
            ? "Please wait…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-stone-600">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-700 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/register" className="text-emerald-700 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
