"use server";

import { randomBytes } from "crypto";
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

/** Turns on the wishlist's share link, keeping the current one if it's already on. */
export async function shareWishlist() {
  const userId = await requireUserId();
  await prisma.user.updateMany({
    where: { id: userId, wishlistShareToken: null },
    data: { wishlistShareToken: randomBytes(16).toString("base64url") },
  });
  revalidatePath("/wishlist");
}

/** Turns the share link off; the old link stops working, and sharing again makes a new one. */
export async function stopSharingWishlist() {
  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { wishlistShareToken: null } });
  revalidatePath("/wishlist");
}
