"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import type { Product } from "@prisma/client";
import type { ProductFormState } from "@/lib/actions/admin";
import { NEW_CATEGORY_VALUE } from "@/lib/categories";
import { buttonClass, inputClass } from "@/components/ui";
import { ProductImageField } from "@/components/ProductImageField";

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
  categories,
  submitLabel,
}: {
  action: Action;
  product?: Product;
  categories: string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    undefined,
  );
  const [, startTransition] = useTransition();

  const [category, setCategory] = useState(
    product?.category ?? categories[0] ?? NEW_CATEGORY_VALUE,
  );
  const [newCategory, setNewCategory] = useState("");
  // Saving waits for a photo upload to finish, so it isn't saved without it.
  const [uploading, setUploading] = useState(false);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Submit manually: React clears a form after an action runs, which would
        // wipe everything the admin typed when the server rejects it.
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="max-w-xl space-y-4"
    >
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
          defaultValue={
            (product ? (product.priceCents / 100).toFixed(2) : undefined)
          }
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
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-ink-mid">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>+ New category…</option>
          </select>
          {category === NEW_CATEGORY_VALUE && (
            <input
              name="newCategory"
              aria-label="New category name"
              required
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Drinks"
              className={`${inputClass} mt-2`}
            />
          )}
        </div>
        <Field
          label="Stock"
          name="stock"
          type="number"
          min="0"
          defaultValue={product?.stock ?? 100}
        />
      </div>

      <ProductImageField defaultValue={product?.imageUrl} onUploadingChange={setUploading} />

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-line bg-white px-4 py-3">
        <input
          type="checkbox"
          name="isPrivateLabel"
          defaultChecked={product?.isPrivateLabel ?? false}
          className="mt-0.5 h-5 w-5 accent-brand"
        />
        <span>
          <span className="block text-sm font-medium text-ink">Our Brand (private label)</span>
          <span className="text-xs text-ink-soft">
            Shows the gold &ldquo;Our Brand&rdquo; tag and adds it to the Our Label row.
          </span>
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={pending || uploading} className={buttonClass.primary}>
          {pending ? "Saving…" : uploading ? "Uploading photo…" : submitLabel}
        </button>
        <Link href="/admin" className={buttonClass.outline}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
