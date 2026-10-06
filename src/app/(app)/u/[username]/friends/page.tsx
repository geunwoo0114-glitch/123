import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSpace } from "@/features/space/queries";
import { listFriends, getBlockedIds } from "@/features/relationships/queries";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export default async function SpaceFriends({ params }: PageProps<"/u/[username]/friends">) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space) notFound();
  if (!space.canView) return null;
  const isOwner = space.relation.state === "SELF";
  const blocked = new Set(viewer ? await getBlockedIds(viewer.id) : []);
  const friends = (await listFriends(space.owner.id, { take: 500 })).filter((f) => !blocked.has(f.id));
  if (friends.length === 0) {
    return (
      <div className="space-card">
        <EmptyState icon={<Users />} title={isOwner ? "새로운 친구를 찾아보세요" : "아직 친구가 없어요"} action={isOwner ? <ButtonLink href="/explore">친구 찾기</ButtonLink> : undefined} />
      </div>
    );
  }
  return (
    <ul className="space-card divide-y divide-line">
      {friends.map((f) => (
        <li key={f.id}>
          <Link href={`/@${f.username}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-space-tint">
            <Avatar name={f.displayName} avatarKey={f.avatarKey} minimi={f.minimi} size="lg" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-semibold">{f.displayName}</span>
                {isOwner && f.isClose && <Star className="size-3.5 fill-current text-warning" aria-label="친한 친구" />}
                {f.label && <span className="rounded-full bg-accent-soft px-2 text-label font-semibold text-accent">{f.label}</span>}
              </span>
              <span className="block truncate text-caption text-fg-muted">{f.statusMessage ? `${f.statusEmoji} ${f.statusMessage}` : `@${f.username}`}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
