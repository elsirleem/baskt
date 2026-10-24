import type { Prisma, SubTier } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cancelAbandonedOrders } from "@/lib/orders";

export async function getProducts(
  opts: { category?: string; query?: string; privateLabel?: boolean } = {},
) {
  // Archived products stay in past orders but leave the shop.
  const where: Prisma.ProductWhereInput = { archivedAt: null };

  if (opts.category && opts.category !== "All") {
    where.category = opts.category;
  }

  if (opts.privateLabel) {
    where.isPrivateLabel = true;
  }

  const q = opts.query?.trim();
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
    where: { archivedAt: null },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug } });
}

/** Recipes that call for a product, for the "Use in these recipes" links. */
export async function getRecipesUsingProduct(productId: string) {
  return prisma.recipe.findMany({
    where: { ingredients: { some: { productId } } },
    select: { slug: true, title: true, isPremium: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Returns the signed-in user's id, or null if not authenticated. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Name and admin flag for the header. */
export async function getUserSummary(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, isAdmin: true },
  });
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

/**
 * Sends non-admins to the home page. Every admin page and admin query calls this:
 * the admin layout's check alone isn't enough, because layouts don't re-run on
 * client-side navigation (see the Next.js authentication guide).
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isCurrentUserAdmin())) redirect("/");
}

export type AdminOrderView = "to-fulfil" | "shipped" | "delivered" | "unpaid";

const ADMIN_ORDER_FILTERS: Record<AdminOrderView, Prisma.OrderWhereInput> = {
  "to-fulfil": { status: "PAID", fulfilment: { in: ["UNFULFILLED", "PACKED"] } },
  shipped: { status: "PAID", fulfilment: "SHIPPED" },
  delivered: { status: "PAID", fulfilment: "DELIVERED" },
  unpaid: { status: { in: ["PENDING", "AWAITING_PAYMENT", "CANCELLED"] } },
};

/** Orders for one admin tab: oldest first when packing, newest first otherwise. */
export async function getAdminOrders(view: AdminOrderView) {
  await requireAdmin();
  await cancelAbandonedOrders();
  return prisma.order.findMany({
    where: ADMIN_ORDER_FILTERS[view],
    include: {
      user: { select: { name: true, email: true } },
      items: { select: { quantity: true } },
    },
    orderBy: { createdAt: view === "to-fulfil" ? "asc" : "desc" },
    take: 100,
  });
}

export async function getAdminOrderCounts(): Promise<Record<AdminOrderView, number>> {
  await requireAdmin();
  const views = Object.keys(ADMIN_ORDER_FILTERS) as AdminOrderView[];
  const counts = await Promise.all(
    views.map((view) => prisma.order.count({ where: ADMIN_ORDER_FILTERS[view] })),
  );
  return Object.fromEntries(views.map((view, i) => [view, counts[i]])) as Record<
    AdminOrderView,
    number
  >;
}

export async function getAdminOrder(id: string) {
  await requireAdmin();
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      items: { include: { product: { select: { slug: true, stock: true } } } },
      emails: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** The customer's most recent paid order that hasn't been delivered yet. */
export async function getActiveOrder(userId: string) {
  return prisma.order.findFirst({
    where: { userId, status: "PAID", fulfilment: { not: "DELIVERED" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, fulfilment: true },
  });
}

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
        isAdmin: true,
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

/** Paid order count and lifetime savings (member discounts + credit used). */
export async function getAccountStats(userId: string) {
  const result = await prisma.order.aggregate({
    where: { userId, status: "PAID" },
    _count: true,
    _sum: { discountCents: true, creditAppliedCents: true },
  });
  return {
    orderCount: result._count,
    savedCents: (result._sum.discountCents ?? 0) + (result._sum.creditAppliedCents ?? 0),
  };
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

/**
 * The customer's orders. Only paid ones count: a checkout that was abandoned or
 * is still waiting on the bank isn't an order yet, so it stays out of history.
 */
export async function getOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId, status: "PAID" },
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
