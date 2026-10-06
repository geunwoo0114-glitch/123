import { requireOnboardedUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { mediaSelect } from "@/features/media/service";
import { ProfileForm } from "@/components/settings/profile-form";
import { AccountSection } from "@/components/settings/account-section";

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
    </div>
  );
}
