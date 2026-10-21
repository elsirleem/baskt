import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";

export const RATE_LIMITED_CODE = "rate_limited";

/** Thrown from `authorize` so the login form can say "too many attempts". */
class TooManyAttempts extends CredentialsSignin {
  code = RATE_LIMITED_CODE;
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
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
