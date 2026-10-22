import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { loginUser } from "@/lib/actions/auth";
import { getCurrentUserId } from "@/lib/data";

export default async function LoginPage(props: { searchParams: Promise<{ reset?: string }> }) {
  if (await getCurrentUserId()) redirect("/");
  const { reset } = await props.searchParams;
  return (
    <AuthForm
      mode="login"
      action={loginUser}
      notice={reset ? "Your password has been changed. Sign in with your new password." : undefined}
    />
  );
}
