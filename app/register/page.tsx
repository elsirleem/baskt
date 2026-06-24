import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { registerUser } from "@/lib/actions/auth";
import { getCurrentUserId } from "@/lib/data";

export default async function RegisterPage(props: {
  searchParams: Promise<{ ref?: string }>;
}) {
  if (await getCurrentUserId()) redirect("/");
  const { ref } = await props.searchParams;
  return <AuthForm mode="register" action={registerUser} refCode={ref} />;
}
