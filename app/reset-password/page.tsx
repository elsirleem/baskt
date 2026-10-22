import Link from "next/link";
import { isResetTokenUsable } from "@/lib/password-reset";
import { ResetPasswordForm } from "@/components/PasswordResetForms";
import { buttonClass, cardClass } from "@/components/ui";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;

  if (!token || !(await isResetTokenUsable(token))) {
    return (
      <div className="mx-auto max-w-sm pt-2 md:pt-8">
        <div className={`${cardClass} p-6`}>
          <h1 className="font-display text-2xl font-bold">This link has expired</h1>
          <p className="mt-2 text-sm text-ink-mid">
            Reset links work once and only for an hour. Ask for a new one and use the latest
            email.
          </p>
          <Link href="/forgot-password" className={`${buttonClass.primary} mt-5 w-full`}>
            Send a new link
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
