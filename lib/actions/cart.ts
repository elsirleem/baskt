"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/data";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  return userId;
}

/** Outcome shown next to the button: an error, or a note when less was added. */
export type CartResult = { ok: true; notice?: string } | { ok: false; error: string };

const MAX_ADD_QUANTITY = 99;

/**
 * Add `quantity` of a product to the basket without going past what's in stock.
 * Used by every "add" path (product page, cards, recipes, wishlist).
 */
async function addWithinStock(
  userId: string,
  productId: string,
  quantity: number,
): Promise<CartResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { name: true, stock: true, archivedAt: true },
  });
  if (!product || product.archivedAt) {
    return { ok: false, error: `${product?.name ?? "That product"} is no longer available.` };
  }
  if (product.stock <= 0) return { ok: false, error: `${product.name} is sold out.` };

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { quantity: true },
  });
  const current = existing?.quantity ?? 0;
  const target = Math.min(current + quantity, product.stock);
  if (target <= current) {
    return {
      ok: false,
      error: `Only ${product.stock} in stock, and they're all in your basket.`,
    };
  }

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: target },
    create: { userId, productId, quantity: target },
  });

  const added = target - current;
  return added < quantity
    ? { ok: true, notice: `Only ${product.stock} in stock, so we added ${added}.` }
    : { ok: true };
}

export async function addToCart(productId: string, quantity = 1): Promise<CartResult> {
  const userId = await requireUserId();
  const qty = Math.min(Math.max(Math.trunc(quantity) || 1, 1), MAX_ADD_QUANTITY);

  const result = await addWithinStock(userId, productId, qty);
  revalidatePath("/cart");
  revalidatePath("/");
  return result;
}

/** Adds one of each product (e.g. a recipe's ingredients), skipping any that are sold out. */
export async function addManyToCart(productIds: string[]): Promise<CartResult> {
  const userId = await requireUserId();

  const skipped: string[] = [];
  for (const productId of new Set(productIds)) {
    const result = await addWithinStock(userId, productId, 1);
    if (!result.ok) skipped.push(result.error);
  }

  revalidatePath("/cart");
  revalidatePath("/");
  return skipped.length ? { ok: true, notice: skipped.join(" ") } : { ok: true };
}

/** Sets a basket line's quantity, capped at what's in stock; 0 removes it. */
export async function updateCartQuantity(productId: string, quantity: number) {
  const userId = await requireUserId();

  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { userId, productId } });
  } else {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    });
    await prisma.cartItem.update({
      where: { userId_productId: { userId, productId } },
      data: { quantity: Math.min(Math.trunc(quantity), Math.max(product?.stock ?? 0, 1)) },
    });
  }

  revalidatePath("/cart");
}

export async function removeFromCart(productId: string) {
  const userId = await requireUserId();
  await prisma.cartItem.deleteMany({ where: { userId, productId } });
  revalidatePath("/cart");
}

/** Wishlist → basket: adds one if in stock, and only then removes it from the wishlist. */
export async function moveToCart(productId: string): Promise<CartResult> {
  const userId = await requireUserId();

  const result = await addWithinStock(userId, productId, 1);
  if (result.ok) {
    await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  }

  revalidatePath("/wishlist");
  revalidatePath("/cart");
  return result;
}
