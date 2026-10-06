"use client";

import Link from "next/link";
import { NotebookPen, Images, DoorOpen } from "lucide-react";
import type { FeedItem } from "@/features/feed/queries";
import { loadFeedPage } from "@/features/feed/actions";
import { moodById } from "@/features/posts/schemas";
import { weatherById } from "@/features/diary/schemas";
import { formatDay, relativeTime } from "@/lib/dates";
import { PostCard } from "@/components/content/post-card";
import { useInfinite } from "@/components/content/infinite";
import { UserLink } from "@/components/user/user-link";
import { MediaImage } from "@/components/media/photo-grid";

function ActivityHeader({ item, verb, icon }: { item: Extract<FeedItem, { kind: "diary" | "photos" }>; verb: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 px-4 pt-4">
      <UserLink user={item.author} meta={<time dateTime={item.at}>{relativeTime(item.at)}</time>} />
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-label font-semibold text-fg-muted">
        {icon}
        {verb}
      </span>
    </div>
  );
}

function VisitLink({ username, name, sub, label }: { username: string; name: string; sub: string; label: string }) {
  return (
    <div className="flex justify-end px-2 py-2">
      <Link href={`/@${username}/${sub}`} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-caption font-semibold text-primary hover:bg-primary-soft">
        <DoorOpen className="size-4" /> {name}네 {label}
      </Link>
    </div>
  );
}

export function FeedItemView({ item, viewerId }: { item: FeedItem; viewerId: string }) {
  if (item.kind === "post") return <PostCard post={item.post} viewerId={viewerId} />;
  if (item.kind === "diary") {
    const { diary, author } = item;
    const mood = moodById(diary.mood);
    const weather = weatherById(diary.weather);
    return (
      <article className="space-card animate-fade-up overflow-hidden">
        <ActivityHeader item={item} verb="다이어리" icon={<NotebookPen className="size-3.5" />} />
        <Link href={`/@${author.username}/diary/${diary.id}`} className="mx-4 mt-3 block rounded-md border border-dashed border-line-strong bg-[repeating-linear-gradient(transparent,transparent_27px,var(--line)_28px)] px-4 py-3 hover:bg-surface-muted">
          <p className="text-label font-semibold text-primary">
            {formatDay(diary.date, { weekday: true })} {weather?.emoji} {mood?.emoji}
          </p>
          <p className="mt-0.5 font-bold">{diary.title}</p>
          <p className="mt-1 line-clamp-3 text-caption leading-[28px] text-fg-muted">{diary.excerpt}</p>
        </Link>
        <VisitLink username={author.username} name={author.displayName} sub="diary" label="다이어리 보기" />
      </article>
    );
  }
  const { album, author } = item;
  return (
    <article className="space-card animate-fade-up overflow-hidden">
      <ActivityHeader item={item} verb="사진첩" icon={<Images className="size-3.5" />} />
      <p className="px-4 pt-3 text-body">
        <b>{album.title}</b> 앨범에 사진을 올렸어요 <span className="text-fg-subtle">· {album.photoCount}장</span>
      </p>
      <Link href={`/@${author.username}/photos/${album.id}`} className="mx-4 mt-3 grid grid-cols-4 gap-1 overflow-hidden rounded-md">
        {album.recent.map((m, i) => (
          <MediaImage key={m.id} media={m} thumb alt={`${album.title} 사진 ${i + 1}`} className="aspect-square size-full" />
        ))}
      </Link>
      <VisitLink username={author.username} name={author.displayName} sub={`photos/${album.id}`} label="사진첩 구경하기" />
    </article>
  );
}

export function FeedList({ initial, nextCursor, viewerId }: { initial: FeedItem[]; nextCursor: string | null; viewerId: string }) {
  const { items, footer } = useInfinite(initial, nextCursor, loadFeedPage);
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <FeedItemView key={`${item.kind}:${item.kind === "post" ? item.post.id : item.kind === "diary" ? item.diary.id : item.album.id + item.at}`} item={item} viewerId={viewerId} />
      ))}
      {footer}
    </div>
  );
}
