"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Product } from "@prisma/client";
import type { ProductFormState } from "@/lib/actions/admin";

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
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
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
        className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-500"
      />
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
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
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={product?.description}
          className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-500"
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
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin"
          className="rounded-md border border-stone-300 px-5 py-2.5 font-medium text-stone-700 hover:bg-stone-100"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
