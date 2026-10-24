import { randomUUID } from "crypto";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";
import { findPendingSignup } from "@/lib/signup";

export const RATE_LIMITED_CODE = "rate_limited";
export const UNCONFIRMED_CODE = "email_unconfirmed";

/** Thrown from `authorize` so the login form can say "too many attempts". */
class TooManyAttempts extends CredentialsSignin {
  code = RATE_LIMITED_CODE;
}

/** Thrown when the details match a sign-up whose email hasn't been confirmed yet. */
class EmailNotConfirmed extends CredentialsSignin {
  code = UNCONFIRMED_CODE;
}

const credentialsSchema = z.object({
  // Emails are stored lowercase, so "Ada@x.com" and "ada@x.com" are one account.
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw, request) => {
        // Limit per network and per account; the account limit can't be dodged
        // by switching IPs.
        const byIp = await rateLimit(`signin:ip:${clientIp(request.headers)}`, LIMITS.signInPerIp);
        if (!byIp.ok) throw new TooManyAttempts();

        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const byEmail = await rateLimit(`signin:email:${email}`, LIMITS.signInPerEmail);
        if (!byEmail.ok) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          if (await findPendingSignup(email, password)) throw new EmailNotConfirmed();
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sid = randomUUID(); // identifies this sign-in
        return token;
      }
      // A password change or reset ends every sign-in that started before it
      // (returning null signs the browser out), except the sign-in that changed it
      // in Settings. Deleting the account ends them too.
      const account = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { passwordChangedAt: true, passwordChangedBySession: true },
      });
      if (!account) return null;
      const changedAt = account.passwordChangedAt
        ? Math.floor(account.passwordChangedAt.getTime() / 1000)
        : 0;
      const startedBefore = (token.iat ?? 0) < changedAt;
      return startedBefore && token.sid !== account.passwordChangedBySession ? null : token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      session.sid = token.sid as string | undefined;
      return session;
    },
  },
});
