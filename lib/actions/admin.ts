"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isCurrentUserAdmin } from "@/lib/data";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) {
    // Hide the existence of admin routes from non-admins.
    redirect("/");
  }
}

export type ProductFormState = { error?: string } | undefined;

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .optional(),
  description: z.string().trim().min(1, "Description is required"),
  priceDollars: z.coerce.number().positive("Price must be greater than 0"),
  currency: z.string().trim().min(3).max(3).default("gbp"),
  category: z.string().trim().min(1, "Category is required"),
  imageUrl: z.string().url("Image URL must be a valid URL"),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parse(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description"),
    priceDollars: formData.get("priceDollars"),
    currency: (formData.get("currency") as string) || "gbp",
    category: formData.get("category"),
    imageUrl: formData.get("imageUrl"),
    stock: formData.get("stock"),
  });
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const slug = data.slug?.length ? data.slug : slugify(data.name);

  const clash = await prisma.product.findUnique({ where: { slug } });
  if (clash) {
    return { error: `A product with slug "${slug}" already exists.` };
  }

  await prisma.product.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      priceCents: Math.round(data.priceDollars * 100),
      currency: data.currency.toLowerCase(),
      category: data.category,
      imageUrl: data.imageUrl,
      stock: data.stock,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const slug = data.slug?.length ? data.slug : slugify(data.name);

  const clash = await prisma.product.findFirst({
    where: { slug, NOT: { id } },
  });
  if (clash) {
    return { error: `A product with slug "${slug}" already exists.` };
  }

  await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      slug,
      description: data.description,
      priceCents: Math.round(data.priceDollars * 100),
      currency: data.currency.toLowerCase(),
      category: data.category,
      imageUrl: data.imageUrl,
      stock: data.stock,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/product/${slug}`);
  redirect("/admin");
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/");
}
