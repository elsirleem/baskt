"use client";

import { useActionState } from "react";
import { changePassword, updateName, type SettingsState } from "@/lib/actions/account";
import { buttonClass, cardClass, inputClass } from "@/components/ui";

function Message({ state }: { state: SettingsState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p role="status" className="rounded-xl bg-brand-pale px-3 py-2 text-sm text-brand">
        ✓ {state.success}
      </p>
    );
  }
  return null;
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
  hint,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink-mid">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        minLength={minLength}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className={inputClass}
      />
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function SettingsForms({ name, email }: { name: string; email: string }) {
  const [nameState, nameAction, namePending] = useActionState(updateName, undefined);
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePassword,
    undefined,
  );

  return (
    <div className="space-y-5">
      <form action={nameAction} className={`${cardClass} space-y-4 p-5`}>
        <h2 className="font-display text-lg font-bold">Your details</h2>
        <Field label="Name" name="name" defaultValue={name} autoComplete="name" />
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-mid">Email</p>
          <p className="rounded-xl bg-cream px-4 py-3 text-[15px] text-ink-soft">{email}</p>
        </div>
        <Message state={nameState} />
        <button type="submit" disabled={namePending} className={`${buttonClass.primary} w-full`}>
          {namePending ? "Saving…" : "Save details"}
        </button>
      </form>

      <form action={passwordAction} className={`${cardClass} space-y-4 p-5`}>
        <h2 className="font-display text-lg font-bold">Change password</h2>
        <Field
          label="Current password"
          name="current"
          type="password"
          autoComplete="current-password"
        />
        <Field
          label="New password"
          name="next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          hint="At least 8 characters."
        />
        <Field
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <Message state={passwordState} />
        <button
          type="submit"
          disabled={passwordPending}
          className={`${buttonClass.primary} w-full`}
        >
          {passwordPending ? "Saving…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
