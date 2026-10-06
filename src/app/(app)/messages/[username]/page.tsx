import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { userCardSelect, toUserCard } from "@/features/users/card";
import { getRelation } from "@/features/relationships/queries";
import { canSendMessage } from "@/features/privacy/policy";
import { listMessages } from "@/features/messages/queries";
import { ThreadView } from "@/components/messages/thread-view";

export async function generateMetadata({ params }: PageProps<"/messages/[username]">) {
  const { username } = await params;
  return { title: `@${username}님과의 쪽지`, robots: { index: false } };
}

export default async function ThreadPage({ params }: PageProps<"/messages/[username]">) {
  const { username } = await params;
  const me = await requireOnboardedUser(`/messages/${username}`);
  const other = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { ...userCardSelect, settings: { select: { messagePolicy: true } } } });
  if (!other || other.status !== "ACTIVE" || other.id === me.id) notFound();
  const rel = await getRelation(me.id, other.id);
  if (rel.state === "BLOCKED_BY") notFound();
  const policy = other.settings?.messagePolicy ?? "FRIENDS";
  const canSend = canSendMessage(rel, policy);
  const page = await listMessages(me.id, other.id);

  let blockedReason: string | null = null;
  if (!canSend) {
    if (rel.state === "BLOCKED") blockedReason = "차단한 사용자예요. 차단을 해제하면 쪽지를 보낼 수 있어요.";
    else if (policy === "FRIENDS") blockedReason = "친구에게만 쪽지를 보낼 수 있어요. 먼저 친구 신청을 보내 보세요.";
    else blockedReason = "이 사용자는 지금 쪽지를 받지 않아요.";
  }

  return <ThreadView other={toUserCard(other)} initial={page.items} olderCursor={page.nextCursor} blockedReason={blockedReason} />;
}
