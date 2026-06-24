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

export async function addToCart(productId: string) {
  const userId = await requireUserId();

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: { increment: 1 } },
    create: { userId, productId, quantity: 1 },
  });

  revalidatePath("/cart");
  revalidatePath("/");
}

export async function addManyToCart(productIds: string[]) {
  const userId = await requireUserId();

  // De-duplicate; each distinct product gets +1.
  const unique = [...new Set(productIds)];
  await prisma.$transaction(
    unique.map((productId) =>
      prisma.cartItem.upsert({
        where: { userId_productId: { userId, productId } },
        update: { quantity: { increment: 1 } },
        create: { userId, productId, quantity: 1 },
      }),
    ),
  );

  revalidatePath("/cart");
  revalidatePath("/");
}

export async function updateCartQuantity(productId: string, quantity: number) {
  const userId = await requireUserId();

  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { userId, productId } });
  } else {
    await prisma.cartItem.update({
      where: { userId_productId: { userId, productId } },
      data: { quantity },
    });
  }

  revalidatePath("/cart");
}

export async function removeFromCart(productId: string) {
  const userId = await requireUserId();
  await prisma.cartItem.deleteMany({ where: { userId, productId } });
  revalidatePath("/cart");
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}
