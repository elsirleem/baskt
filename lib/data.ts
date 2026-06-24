import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getProducts(category?: string, query?: string) {
  const where: import("@prisma/client").Prisma.ProductWhereInput = {};

  if (category && category !== "All") {
    where.category = category;
  }

  const q = query?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  return prisma.product.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });
}

export async function getCategories() {
  const rows = await prisma.product.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug } });
}

/** Returns the signed-in user's id, or null if not authenticated. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Returns whether the signed-in user is an admin. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return user?.isAdmin ?? false;
}

import type { SubTier } from "@prisma/client";

/** Subscription tier for a user, defaulting to PAYG when no active subscription exists. */
export async function getUserTier(userId: string): Promise<SubTier> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || sub.status !== "active") return "PAYG";
  return sub.tier;
}

export async function getAccount(userId: string) {
  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        creditCents: true,
        referralCode: true,
        referredById: true,
        _count: { select: { referrals: true } },
      },
    }),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);
  const tier: SubTier =
    subscription && subscription.status === "active" ? subscription.tier : "PAYG";
  return { user, subscription, tier };
}

export async function getRecipes() {
  return prisma.recipe.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getRecipeBySlug(slug: string) {
  return prisma.recipe.findUnique({
    where: { slug },
    include: {
      ingredients: {
        orderBy: { sortOrder: "asc" },
        include: { product: true },
      },
    },
  });
}

export async function getOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCart(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCartCount(userId: string): Promise<number> {
  const result = await prisma.cartItem.aggregate({
    where: { userId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

export async function getWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWishlistProductIds(userId: string): Promise<Set<string>> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });
  return new Set(items.map((i) => i.productId));
}
