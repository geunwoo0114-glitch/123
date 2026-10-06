import { requireOnboardedUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { mediaSelect } from "@/features/media/service";
import { ProfileForm } from "@/components/settings/profile-form";
import { AccountSection } from "@/components/settings/account-section";
import { DeleteAccount } from "@/components/settings/delete-account";
import Link from "next/link";

export default async function ProfileSettingsPage() {
  const me = await requireOnboardedUser("/settings");
  const account = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { email: true, emailVerifiedAt: true } });
  const profile = await db.profile.findUniqueOrThrow({
    where: { userId: me.id },
    select: { displayName: true, bio: true, statusMessage: true, statusEmoji: true, interests: true, avatarMedia: { select: mediaSelect }, coverMedia: { select: mediaSelect } },
  });
  return (
    <div className="flex flex-col gap-6">
      <ProfileForm initial={profile} />
      <AccountSection username={me.username} email={account.email} verified={!!account.emailVerifiedAt} />
      <DeleteAccount />
      <p className="text-center text-caption text-fg-subtle">
        <Link href="/terms" className="hover:underline">이용약관</Link> · <Link href="/privacy" className="font-semibold hover:underline">개인정보처리방침</Link>
      </p>
    </div>
  );
}
