import Link from "next/link";
import { Mail } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { relativeTime } from "@/lib/dates";
import { listConversations } from "@/features/messages/queries";
import { MobileTopBar } from "@/components/shell/nav";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const metadata = { title: "쪽지" };

export default async function MessagesPage() {
  const me = await requireOnboardedUser("/messages");
  const conversations = await listConversations(me.id);
  return (
    <>
      <MobileTopBar title="쪽지" />
      <div className="mx-auto max-w-[640px] px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-4 hidden text-display font-bold lg:block">쪽지</h1>
        {conversations.length === 0 ? (
          <div className="space-card">
            <EmptyState
              icon={<Mail />}
              title="아직 주고받은 쪽지가 없어요"
              description="친구의 공간에서 '쪽지' 버튼을 눌러 조용히 안부를 전해 보세요."
              action={<ButtonLink href="/friends">친구 보러 가기</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="space-card divide-y divide-line overflow-hidden">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link href={`/messages/${c.other.username}`} className={cn("flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted", c.unread && "bg-primary-soft/40")}>
                  <Avatar name={c.other.displayName} avatarKey={c.other.avatarKey} minimi={c.other.minimi} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate", c.unread ? "font-bold" : "font-semibold")}>{c.other.displayName}</span>
                      <time dateTime={c.lastMessageAt} className="shrink-0 text-label text-fg-subtle">
                        {relativeTime(c.lastMessageAt)}
                      </time>
                    </span>
                    <span className={cn("block truncate text-caption", c.unread ? "font-medium text-fg" : "text-fg-muted")}>
                      {c.lastFromMe && <span className="text-fg-subtle">나: </span>}
                      {c.lastPreview}
                    </span>
                  </span>
                  {c.unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="안 읽은 쪽지" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
