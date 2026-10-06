import { requireOnboardedUser } from "@/lib/auth/guards";
import { listNotifications } from "@/features/notifications/queries";
import { MobileTopBar } from "@/components/shell/nav";
import { NotificationList } from "@/components/home/notification-list";

export const metadata = { title: "알림" };

export default async function NotificationsPage() {
  const me = await requireOnboardedUser("/notifications");
  const page = await listNotifications(me.id);
  return (
    <>
      <MobileTopBar title="알림" />
      <div className="mx-auto max-w-[640px] px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-4 hidden text-display font-bold lg:block">알림</h1>
        <NotificationList initial={page.items} nextCursor={page.nextCursor} username={me.username} />
      </div>
    </>
  );
}
