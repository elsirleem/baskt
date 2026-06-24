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

export async function toggleWishlist(productId: string) {
  const userId = await requireUserId();

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.wishlistItem.create({ data: { userId, productId } });
  }

  revalidatePath("/wishlist");
  revalidatePath("/");
}

export async function removeFromWishlist(productId: string) {
  const userId = await requireUserId();
  await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  revalidatePath("/wishlist");
}

export async function moveToCart(productId: string) {
  const userId = await requireUserId();

  await prisma.$transaction([
    prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: { quantity: { increment: 1 } },
      create: { userId, productId, quantity: 1 },
    }),
    prisma.wishlistItem.deleteMany({ where: { userId, productId } }),
  ]);

  revalidatePath("/wishlist");
  revalidatePath("/cart");
}
