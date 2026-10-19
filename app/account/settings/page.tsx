import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/data";
import { SettingsForms } from "@/components/SettingsForms";
import { BackLink, PageTitle } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg">
      <BackLink href="/account" label="Profile" />
      <PageTitle>Settings ⚙️</PageTitle>
      <SettingsForms name={user.name ?? ""} email={user.email} />
    </div>
  );
}
