import Link from "next/link";
import type { UserCard } from "@/features/users/card";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

/** '친구들의 요즘': 상태 메시지가 말풍선으로 보이는 가로 스트립. 누르면 그 친구의 공간으로. */
export function StatusStrip({ me, friends }: { me: UserCard; friends: (UserCard & { statusFresh: boolean })[] }) {
  const people = [{ ...me, statusFresh: false, isMe: true }, ...friends.map((f) => ({ ...f, isMe: false }))];
  return (
    <section aria-label="친구들의 요즘" className="scrollbar-none -mx-4 overflow-x-auto px-4">
      <ul className="flex gap-3 pt-7 pb-1">
        {people.map((p) => (
          <li key={p.id} className="w-[76px] shrink-0">
            <Link href={`/@${p.username}`} className="group relative flex flex-col items-center gap-1.5">
              {(p.statusMessage || p.isMe) && (
                <span
                  className={cn(
                    "absolute -top-7 left-1/2 z-10 max-w-[92px] -translate-x-1/2 truncate rounded-xl bg-surface px-2 py-1 text-[11px] font-medium shadow-2",
                    !p.statusMessage && "text-fg-subtle",
                  )}
                >
                  {p.statusMessage ? `${p.statusEmoji} ${p.statusMessage}`.trim() : "상태 남기기"}
                </span>
              )}
              <span className={cn("rounded-full p-[3px]", p.statusFresh ? "bg-primary" : "bg-transparent")}>
                <Avatar name={p.displayName} avatarKey={p.avatarKey} minimi={p.minimi} size="lg" ring />
              </span>
              <span className="w-full truncate text-center text-label font-medium text-fg-muted group-hover:text-fg">{p.isMe ? "나" : p.displayName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
