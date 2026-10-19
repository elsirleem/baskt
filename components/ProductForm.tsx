"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Product } from "@prisma/client";
import type { ProductFormState } from "@/lib/actions/admin";
import { buttonClass, inputClass } from "@/components/ui";

type Action = (
  prev: ProductFormState,
  formData: FormData,
) => Promise<ProductFormState>;

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = true,
  step,
  min,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  placeholder?: string;
  hint?: string;
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
        defaultValue={defaultValue}
        required={required}
        step={step}
        min={min}
        placeholder={placeholder}
        className={inputClass}
      />
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function ProductForm({
  action,
  product,
  submitLabel,
}: {
  action: Action;
  product?: Product;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <Field label="Name" name="name" defaultValue={product?.name} />
      <Field
        label="Slug"
        name="slug"
        defaultValue={product?.slug}
        required={false}
        placeholder="auto-generated from name if left blank"
        hint="Lowercase letters, numbers, and hyphens only."
      />

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-ink-mid">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={product?.description}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Price (in pounds)"
          name="priceDollars"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product ? (product.priceCents / 100).toFixed(2) : undefined}
          placeholder="5.99"
        />
        <Field
          label="Currency"
          name="currency"
          defaultValue={product?.currency ?? "gbp"}
          hint="3-letter code, e.g. gbp"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Pack size"
          name="size"
          defaultValue={product?.size ?? undefined}
          required={false}
          placeholder="1kg"
          hint="Shown under the name, e.g. 1kg or 5-pack."
        />
        <Field
          label="Badges"
          name="badges"
          defaultValue={product?.badges.join(", ")}
          required={false}
          placeholder="Co-op sourced, Unrefined"
          hint="Comma-separated, up to 4."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" name="category" defaultValue={product?.category} />
        <Field
          label="Stock"
          name="stock"
          type="number"
          min="0"
          defaultValue={product?.stock ?? 100}
        />
      </div>

      <Field
        label="Image URL"
        name="imageUrl"
        type="url"
        defaultValue={product?.imageUrl}
        placeholder="https://images.unsplash.com/..."
        hint="Must be an https://images.unsplash.com URL (see next.config.ts)."
      />

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className={buttonClass.primary}
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin"
          className={buttonClass.outline}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
