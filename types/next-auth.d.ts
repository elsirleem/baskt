import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    /** Random id of this sign-in (see the jwt callback in lib/auth.ts). */
    sid?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    sid?: string;
    iat?: number;
  }
}
