"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isCurrentUserAdmin } from "@/lib/data";
import { isAllowedImageUrl } from "@/lib/images";
import { storeProductImage, type StoredImage } from "@/lib/product-images";
import { NEW_CATEGORY_VALUE } from "@/lib/categories";
import { CARRIERS, FULFILMENT_STEPS, canMoveTo, stepIndex } from "@/lib/fulfilment";
import { sendOrderShippedEmail } from "@/lib/order-emails";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) {
    // Hide the existence of admin routes from non-admins.
    redirect("/");
  }
}

export type ProductFormState = { error?: string } | undefined;

/** "Upload a photo" on the product form; the returned address goes in the image field. */
export async function uploadProductImage(formData: FormData): Promise<StoredImage> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a photo to upload." };
  try {
    return await storeProductImage(file);
  } catch (error) {
    console.error("[upload] product photo failed:", error);
    return { error: "The upload didn't work. Please try again." };
  }
}

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
  imageUrl: z
    .string()
    .trim()
    .refine(isAllowedImageUrl, {
      message: "Upload a photo, or use an image link from images.unsplash.com (starting with https://).",
    }),
  isPrivateLabel: z.boolean(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  size: z.string().trim().max(40).optional(),
  // Comma-separated in the form, e.g. "Co-op sourced, Unrefined".
  badges: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean)
        .slice(0, 4),
    ),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parse(formData: FormData) {
  const category =
    formData.get("category") === NEW_CATEGORY_VALUE
      ? formData.get("newCategory")
      : formData.get("category");
  return productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description"),
    priceDollars: formData.get("priceDollars"),
    currency: (formData.get("currency") as string) || "gbp",
    category,
    imageUrl: formData.get("imageUrl"),
    isPrivateLabel: formData.get("isPrivateLabel") === "on",
    stock: formData.get("stock"),
    size: (formData.get("size") as string) || undefined,
    badges: (formData.get("badges") as string) || undefined,
  });
}

/** Reuse an existing category's spelling so "spices" doesn't become a second tile. */
async function canonicalCategory(name: string): Promise<string> {
  const existing = await prisma.product.findFirst({
    where: { category: { equals: name, mode: "insensitive" } },
    select: { category: true },
  });
  return existing?.category ?? name;
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
      category: await canonicalCategory(data.category),
      imageUrl: data.imageUrl,
      isPrivateLabel: data.isPrivateLabel,
      stock: data.stock,
      size: data.size || null,
      badges: data.badges,
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
      category: await canonicalCategory(data.category),
      imageUrl: data.imageUrl,
      isPrivateLabel: data.isPrivateLabel,
      stock: data.stock,
      size: data.size || null,
      badges: data.badges,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/product/${slug}`);
  redirect("/admin");
}

/** Deletes a product that has never been ordered; ordered ones must be archived. */
export async function deleteProduct(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  if ((await prisma.orderItem.count({ where: { productId: id } })) > 0) {
    return { error: "This product is in past orders, so it can't be deleted. Archive it instead." };
  }
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/");
  return {};
}

/** Archive hides a product from the shop (past orders keep it); restore brings it back. */
export async function setProductArchived(id: string, archived: boolean) {
  await requireAdmin();
  const product = await prisma.product.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
    select: { slug: true },
  });
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/product/${product.slug}`);
}

export type FulfilmentFormState = { error?: string } | undefined;

const fulfilmentSchema = z
  .object({
    orderId: z.string().min(1),
    next: z.enum(["PACKED", "SHIPPED", "DELIVERED"]),
    carrier: z.enum(CARRIERS).optional(),
    trackingNumber: z.string().trim().max(60).optional(),
  })
  .refine((v) => v.next !== "SHIPPED" || v.carrier, {
    message: "Choose who is delivering it.",
  });

/**
 * Moves a paid order forward (packed → shipped → delivered). Skipped steps get
 * the same timestamp, and two admins clicking at once can't both apply a step.
 */
export async function updateFulfilment(
  _prev: FulfilmentFormState,
  formData: FormData,
): Promise<FulfilmentFormState> {
  await requireAdmin();

  const parsed = fulfilmentSchema.safeParse({
    orderId: formData.get("orderId"),
    next: formData.get("next"),
    carrier: formData.get("carrier") || undefined,
    trackingNumber: formData.get("trackingNumber") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { orderId, next, carrier, trackingNumber } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, fulfilment: true, packedAt: true, shippedAt: true },
  });
  if (!order || order.status !== "PAID") {
    return { error: "Only paid orders can be packed or shipped." };
  }
  if (!canMoveTo(order.fulfilment, next)) {
    return { error: `This order is already marked ${FULFILMENT_STEPS[stepIndex(order.fulfilment)].adminLabel.toLowerCase()}.` };
  }

  const now = new Date();
  const reaches = (status: "PACKED" | "SHIPPED") => stepIndex(next) >= stepIndex(status);
  const updated = await prisma.order.updateMany({
    where: { id: orderId, fulfilment: order.fulfilment },
    data: {
      fulfilment: next,
      ...(reaches("PACKED") && !order.packedAt && { packedAt: now }),
      ...(reaches("SHIPPED") && !order.shippedAt && { shippedAt: now }),
      ...(next === "SHIPPED" && { carrier, trackingNumber: trackingNumber || null }),
      ...(next === "DELIVERED" && { deliveredAt: now }),
    },
  });
  if (updated.count === 0) {
    return { error: "Someone else just updated this order. Reload to see the latest." };
  }

  if (next === "SHIPPED") await sendOrderShippedEmail(orderId);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/orders");
  return undefined;
}
