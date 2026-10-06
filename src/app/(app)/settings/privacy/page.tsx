import { requireOnboardedUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { listBlocked } from "@/features/relationships/queries";
import { PrivacyForm } from "@/components/settings/privacy-form";
import { BlockedList } from "@/components/settings/blocked-list";
import { PushSettings } from "@/components/settings/push-settings";
import { vapidPublicKey } from "@/features/push/service";

export default async function PrivacySettingsPage() {
  const me = await requireOnboardedUser("/settings/privacy");
  const [settings, blocked] = await Promise.all([db.userSettings.findUnique({ where: { userId: me.id } }), listBlocked(me.id)]);
  return (
    <div className="flex flex-col gap-4">
      <PrivacyForm
        initial={{
          spaceVisibility: settings?.spaceVisibility === "FRIENDS" || settings?.spaceVisibility === "PRIVATE" ? settings.spaceVisibility : "PUBLIC",
          guestbookPolicy: settings?.guestbookPolicy ?? "EVERYONE",
          messagePolicy: settings?.messagePolicy ?? "FRIENDS",
          leaveVisitTraces: settings?.leaveVisitTraces ?? true,
          showVisitorsPublic: settings?.showVisitorsPublic ?? false,
          discoverable: settings?.discoverable ?? true,
          allowFriendRequests: settings?.allowFriendRequests ?? true,
          notifyLikes: settings?.notifyLikes ?? true,
          notifyComments: settings?.notifyComments ?? true,
          notifyGuestbook: settings?.notifyGuestbook ?? true,
          notifyFollows: settings?.notifyFollows ?? true,
        }}
      />
      <PushSettings quietHours={settings?.pushQuietHours ?? true} publicKey={vapidPublicKey} />
      <BlockedList users={blocked} />
    </div>
  );
}
