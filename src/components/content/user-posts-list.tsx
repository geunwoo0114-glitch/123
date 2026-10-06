"use client";

import type { PostDTO } from "@/features/posts/queries";
import { loadUserPostsPage } from "@/features/feed/actions";
import { PostCard } from "./post-card";
import { useInfinite } from "./infinite";

export function UserPostsList({ ownerId, initial, nextCursor, viewerId, pinnedId, isOwner }: { ownerId: string; initial: PostDTO[]; nextCursor: string | null; viewerId: string | null; pinnedId: string | null; isOwner: boolean }) {
  const { items, footer } = useInfinite(initial, nextCursor, (c) => loadUserPostsPage(ownerId, c));
  return (
    <div className="flex flex-col gap-4">
      {items.filter((p) => p.id !== pinnedId).map((p) => (
        <PostCard key={p.id} post={p} viewerId={viewerId} showVisitCta={false} isPinnable={isOwner} />
      ))}
      {footer}
    </div>
  );
}
