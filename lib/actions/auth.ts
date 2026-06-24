"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { ensureReferralCode, resolveReferrer } from "@/lib/referral";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type FormState = { error?: string } | undefined;

export async function registerUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  // Link the referrer if a valid code was supplied.
  const referredById = await resolveReferrer(formData.get("ref") as string | null);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, referredById },
  });
  await ensureReferralCode(user.id);

  // Sign the new user in immediately.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  });

  return undefined;
}

export async function loginUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // signIn throws a redirect on success — re-throw so Next handles it.
    throw error;
  }

  return undefined;
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" });
  redirect("/");
}
