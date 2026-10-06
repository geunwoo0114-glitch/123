import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { defaultAvatar, parseAvatar } from "@/features/avatar/schema";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "내 다락 꾸미기", robots: { index: false } };

export default async function OnboardingPage() {
  const me = await requireUser("/onboarding");
  if (me.onboarded) redirect("/");
  const profile = await db.profile.findUnique({ where: { userId: me.id }, select: { displayName: true, avatar: true } });
  return <OnboardingFlow username={me.username} displayName={profile?.displayName ?? me.username} avatar={parseAvatar(profile?.avatar) ?? defaultAvatar} />;
}
