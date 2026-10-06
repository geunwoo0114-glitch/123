import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSpace } from "@/features/space/queries";
import { listGuestbook } from "@/features/guestbook/queries";
import { GuestbookBoard } from "@/components/space/guestbook-board";

export default async function GuestbookPage({ params }: PageProps<"/u/[username]/guestbook">) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space) notFound();
  if (!space.canView) return null;
  const page = await listGuestbook(space.owner.id, viewer?.id ?? null);
  let closedReason: string | null = null;
  if (!space.canWriteGuestbook) {
    if (!viewer) closedReason = "로그인하면 방명록을 남길 수 있어요.";
    else if (space.relation.state === "SELF") closedReason = null;
    else if (space.guestbookPolicy === "FRIENDS") closedReason = "친구만 방명록을 남길 수 있어요.";
    else closedReason = "지금은 방명록을 받지 않아요.";
  }
  return (
    <GuestbookBoard
      hostId={space.owner.id}
      hostName={space.owner.displayName}
      initial={page.items}
      nextCursor={page.nextCursor}
      canWrite={space.canWriteGuestbook}
      closedReason={closedReason}
      isOwner={space.relation.state === "SELF"}
      viewerId={viewer?.id ?? null}
    />
  );
}
