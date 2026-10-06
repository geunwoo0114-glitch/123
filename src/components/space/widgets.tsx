import Link from "next/link";
import { ChevronRight, Lock, Music2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatDay, relativeTime } from "@/lib/dates";
import type { PhotoDTO } from "@/features/albums/queries";
import type { GuestbookEntryDTO } from "@/features/guestbook/queries";
import type { FriendListItem } from "@/features/relationships/queries";
import type { MusicEmbed } from "@/features/space/music";
import type { Visibility } from "@/features/privacy/policy";
import { moodById } from "@/features/posts/schemas";
import { weatherById } from "@/features/diary/schemas";
import { stickerById } from "@/features/guestbook/schemas";
import { Avatar } from "@/components/ui/avatar";
import { MediaImage } from "@/components/media/photo-grid";

export function Widget({ title, href, action, children, className }: { title: string; href?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-card p-4 sm:p-5", className)} aria-label={title}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-title font-bold">{title}</h2>
        {action ??
          (href && (
            <Link href={href} className="inline-flex items-center text-caption font-medium text-fg-muted hover:text-fg">
              더 보기 <ChevronRight className="size-4" />
            </Link>
          ))}
      </header>
      {children}
    </section>
  );
}

export function WidgetEmpty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md bg-space-tint px-4 py-8 text-center text-caption text-fg-muted">
      {children}
      {action}
    </div>
  );
}

export function MusicWidget({ music, title }: { music: { embed: MusicEmbed; title: string | null; artist: string | null }; title: string }) {
  return (
    <Widget title="BGM">
      {(music.title || music.artist) && (
        <p className="mb-2 flex items-center gap-2 text-caption text-fg-muted">
          <Music2 className="size-4 shrink-0 text-accent" />
          <span className="truncate">
            <b className="text-fg">{music.title}</b> {music.artist && `· ${music.artist}`}
          </span>
        </p>
      )}
      <iframe
        title={`${title} BGM`}
        src={music.embed.embedUrl}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        className={cn("w-full rounded-md border-0", music.embed.provider === "spotify" ? "h-[152px]" : "aspect-video")}
      />
    </Widget>
  );
}

export type DiaryListItem = { id: string; date: string; title: string; body: string; mood: string | null; weather: string | null; visibility: Visibility };

export function DiaryItem({ entry, href, compact }: { entry: DiaryListItem; href: string; compact?: boolean }) {
  const mood = moodById(entry.mood);
  const weather = weatherById(entry.weather);
  const [, m, d] = entry.date.split("-");
  return (
    <Link href={href} className="group flex gap-3 rounded-md p-2 transition-colors hover:bg-space-tint">
      <span className="flex w-12 shrink-0 flex-col items-center justify-center rounded-md bg-accent-soft py-1.5 text-accent">
        <span className="text-label font-semibold">{Number(m)}월</span>
        <span className="text-heading leading-none font-bold">{Number(d)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-semibold group-hover:underline">{entry.title}</span>
          {entry.visibility === "PRIVATE" && <Lock className="size-3.5 shrink-0 text-fg-subtle" aria-label="나만 보기" />}
        </span>
        {!compact && <span className="line-clamp-2 text-caption text-fg-muted">{entry.body}</span>}
        <span className="text-label text-fg-subtle">
          {[weather && `${weather.emoji} ${weather.label}`, mood && `${mood.emoji} ${mood.label}`].filter(Boolean).join(" · ") || formatDay(entry.date, { weekday: true })}
        </span>
      </span>
    </Link>
  );
}

export function PhotoTiles({ photos, href }: { photos: PhotoDTO[]; href: string }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {photos.map((p) => (
        <Link key={p.id} href={href} className="aspect-square overflow-hidden rounded-sm bg-surface-muted">
          <MediaImage media={p.media} thumb alt={p.caption || "사진첩 사진"} className="size-full transition-transform duration-300 hover:scale-105" />
        </Link>
      ))}
    </div>
  );
}

/** 방명록 메모지 (요약 버전) */
export function GuestNote({ entry }: { entry: GuestbookEntryDTO }) {
  const sticker = stickerById(entry.sticker);
  if (entry.hidden) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-3 text-caption text-fg-subtle">
        <Lock className="size-4" /> 비밀 방명록이에요
      </div>
    );
  }
  return (
    <div className="relative rounded-md px-3.5 py-3 text-[#2b2320]" style={{ backgroundColor: sticker.paper }}>
      <span className="absolute -top-2 right-3 text-[20px]" aria-hidden>
        {sticker.emoji}
      </span>
      <p className="line-clamp-3 text-caption whitespace-pre-wrap">{entry.body}</p>
      {entry.author && (
        <p className="mt-2 flex items-center gap-1.5 text-label text-[#6a625a]">
          <Avatar name={entry.author.displayName} avatarKey={entry.author.avatarKey} minimi={entry.author.minimi} size="xs" />
          {entry.author.displayName} · {relativeTime(entry.createdAt)}
        </p>
      )}
    </div>
  );
}

export function FriendFaces({ friends }: { friends: FriendListItem[] }) {
  return (
    <ul className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6 xl:grid-cols-4">
      {friends.map((f) => (
        <li key={f.id}>
          <Link href={`/@${f.username}`} className="flex flex-col items-center gap-1 text-center">
            <Avatar name={f.displayName} avatarKey={f.avatarKey} minimi={f.minimi} size="lg" />
            <span className="w-full truncate text-label font-medium">{f.displayName}</span>
            {f.label && <span className="-mt-1 w-full truncate text-[11px] text-accent">{f.label}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
