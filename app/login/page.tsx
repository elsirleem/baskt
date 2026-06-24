import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { loginUser } from "@/lib/actions/auth";
import { getCurrentUserId } from "@/lib/data";

export default async function LoginPage() {
  if (await getCurrentUserId()) redirect("/");
  return <AuthForm mode="login" action={loginUser} />;
}
