import Link from "next/link";
import { signupEmailForToken } from "@/lib/signup";
import { ConfirmEmailForm } from "@/components/SignupConfirmation";
import { buttonClass, cardClass } from "@/components/ui";

export const metadata = { title: "Confirm your email" };

export default async function ConfirmEmailPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;
  const email = token ? await signupEmailForToken(token) : null;

  if (!token || !email) {
    return (
      <div className="mx-auto max-w-sm pt-2 md:pt-8">
        <div className={`${cardClass} p-6`}>
          <h1 className="font-display text-2xl font-bold">This link has expired</h1>
          <p className="mt-2 text-sm text-ink-mid">
            Confirmation links work once and only for 24 hours. If you&apos;ve already confirmed
            your email, just sign in. Otherwise, sign up again for a new link.
          </p>
          <div className="mt-5 grid gap-3">
            <Link href="/login" className={buttonClass.primary}>
              Sign in
            </Link>
            <Link href="/register" className={buttonClass.outline}>
              Sign up again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ConfirmEmailForm token={token} email={email} />;
}
