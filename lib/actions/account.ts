"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/data";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export type SettingsState = { error?: string; success?: string } | undefined;

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  return userId;
}

const nameSchema = z.string().trim().min(1, "Name is required").max(100);

export async function updateName(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const userId = await requireUserId();

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data } });
  revalidatePath("/", "layout");
  return { success: "Name updated." };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "New password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "New passwords don't match" });

export async function changePassword(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const userId = await requireUserId();

  // Stops someone with a borrowed session from guessing the current password.
  const limited = await rateLimit(`password:user:${userId}`, LIMITS.passwordChangePerUser);
  if (!limited.ok) {
    return { error: "Too many attempts. Please wait 15 minutes and try again." };
  }

  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    return { error: "Your current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.next, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { success: "Password changed." };
}
