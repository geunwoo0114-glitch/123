import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Box, MessageCircleHeart, Music2, NotebookPen, PenLine } from "lucide-react";
import type { UserCard } from "@/features/users/card";
import type { DiaryDTO } from "@/features/diary/queries";
import type { GuestbookEntryDTO } from "@/features/guestbook/queries";
import type { MusicEmbed } from "@/features/space/music";
import { moodById } from "@/features/posts/schemas";
import { mediaUrl } from "@/lib/media/url";
import { formatDay, relativeTime } from "@/lib/dates";
import { brand } from "@/config/brand";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { DashedEmpty, Eyebrow, SectionTitle } from "@/components/ui/section";
import { GuestNote } from "@/components/space/widgets";
import { cn } from "@/lib/cn";

const card = "rounded-2xl border border-line bg-surface shadow-2";

/* ───────── 프로필 카드 ───────── */

export function ProfileCard({ me, stats, friends }: { me: UserCard; stats: { today: number; total: number }; friends: number }) {
  return (
    <section className={cn(card, "flex flex-col overflow-hidden")} aria-label="내 프로필">
      <div className="relative h-24 bg-gradient-to-br from-[#efe9ff] via-[#f6efff] to-[#ffeaf3] dark:from-[#2a2245] dark:via-[#251f38] dark:to-[#33213a]" aria-hidden>
        <span className="absolute top-4 left-6 size-10 rounded-full bg-[#fde9a8] opacity-80" />
        <span className="absolute top-7 right-6 size-14 rounded-full bg-[#d9ccff] opacity-80" />
      </div>
      <div className="-mt-12 flex flex-1 flex-col items-center px-5 pb-5 text-center">
        <Link href={`/@${me.username}`} className="rounded-full ring-4 ring-surface">
          <Avatar name={me.displayName} avatarKey={me.avatarKey} minimi={me.minimi} size="xl" />
        </Link>
        <p className="mt-2 text-title font-bold">{me.displayName}</p>
        <p className="text-caption text-fg-subtle">@{me.username}</p>
        <p className="mt-2 line-clamp-2 min-h-5 text-caption text-fg-muted">{me.statusMessage ? `${me.statusEmoji} ${me.statusMessage}`.trim() : "상태 메시지를 남겨 보세요"}</p>
        <dl className="mt-4 grid w-full grid-cols-3 divide-x divide-line border-y border-line py-3">
          {[
            ["친구", friends],
            ["오늘 방문", stats.today],
            ["전체 방문", stats.total],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="text-label text-fg-subtle">{label}</dt>
              <dd className="text-title font-bold tabular-nums">{Number(value).toLocaleString()}</dd>
            </div>
          ))}
        </dl>
        <ButtonLink href={`/@${me.username}`} variant="secondary" className="mt-4 w-full rounded-full">
          내 {brand.spaceNoun} 가기
        </ButtonLink>
      </div>
    </section>
  );
}

/* ───────── 오늘의 순간 ───────── */

export type Moment = {
  href: string;
  image: { key: string; dominant: string; alt: string } | null;
  text: string;
  author: UserCard;
  at: string;
  mood: string | null;
};

export function MomentCard({ moment, prompt }: { moment: Moment | null; prompt: string }) {
  if (!moment?.image) {
    return (
      <Link href={moment?.href ?? "/write"} className={cn(card, "group relative flex h-full min-h-72 flex-col justify-end overflow-hidden p-7 text-white")}>
        <span className="absolute inset-0 bg-gradient-to-br from-[#8b6bff] via-[#a77bf3] to-[#f39bb5]" aria-hidden />
        <span className="absolute -top-10 -right-10 size-48 rounded-full bg-white/15" aria-hidden />
        <span className="absolute top-16 right-24 size-16 rounded-full bg-white/10" aria-hidden />
        <span className="relative">
          <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-label font-bold text-[#5a38e0]">오늘의 질문</span>
          <span className="mt-3 block text-[1.6rem] leading-snug font-bold tracking-tight text-balance">{moment?.text || prompt}</span>
          <span className="mt-3 inline-flex items-center gap-1.5 text-caption font-semibold text-white/90 group-hover:underline">
            <PenLine className="size-4" /> 기록하러 가기
          </span>
        </span>
      </Link>
    );
  }
  const mood = moodById(moment.mood);
  return (
    <Link href={moment.href} className={cn(card, "group relative flex h-full min-h-72 flex-col justify-end overflow-hidden p-7 text-white")} style={{ backgroundColor: moment.image.dominant }}>
      <Image src={mediaUrl(moment.image.key)!} alt={moment.image.alt} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" unoptimized />
      <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" aria-hidden />
      <span className="relative">
        <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-label font-bold text-[#5a38e0]">오늘의 순간</span>
        <span className="mt-3 line-clamp-2 block text-[1.6rem] leading-snug font-bold tracking-tight text-balance drop-shadow">{moment.text || "새 사진이 올라왔어요"}</span>
        <span className="mt-2 flex items-center gap-1.5 text-caption text-white/90">
          {moment.author.displayName} · {relativeTime(moment.at)}
          {mood && ` · ${mood.emoji} ${mood.label}`}
        </span>
      </span>
    </Link>
  );
}

/* ───────── 최근 다이어리 ───────── */

export function MemoriesSection({ entries, username }: { entries: DiaryDTO[]; username: string }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="memories-title">
      <SectionTitle
        eyebrow="Recent memories"
        title={<span id="memories-title">최근 다이어리</span>}
        action={
          entries.length > 0 && (
            <Link href={`/@${username}/diary`} className="flex items-center gap-1 text-caption font-semibold text-fg-muted hover:text-fg">
              전체 보기 <ArrowRight className="size-4" />
            </Link>
          )
        }
      />
      {entries.length > 0 ? (
        <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {entries.map((d) => (
            <li key={d.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
              <Link href={`/@${username}/diary/${d.id}`} className={cn(card, "flex h-full flex-col overflow-hidden transition-shadow hover:shadow-3")}>
                {d.images[0] ? (
                  <span className="relative block aspect-[16/9]" style={{ backgroundColor: d.images[0].dominant }}>
                    <Image src={mediaUrl(d.images[0].thumbKey)!} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" className="object-cover" unoptimized />
                  </span>
                ) : (
                  <span className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-primary-soft to-surface-muted text-[34px]" aria-hidden>
                    {moodById(d.mood)?.emoji ?? "📔"}
                  </span>
                )}
                <span className="flex flex-1 flex-col gap-1 p-4">
                  <span className="text-label font-semibold text-primary">{formatDay(d.date, { weekday: true })}</span>
                  <span className="line-clamp-1 font-bold">{d.title}</span>
                  <span className="line-clamp-2 text-caption text-fg-muted">{d.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <DashedEmpty icon={<NotebookPen />} title="아직 다이어리가 없어요" description="첫 기록을 남겨 보세요" action={<ButtonLink href="/write/diary" size="sm" variant="soft">다이어리 쓰기</ButtonLink>} className="bg-surface" />
      )}
    </section>
  );
}

/* ───────── 다녀간 친구들 ───────── */

export function GuestbookCard({ entries, username }: { entries: GuestbookEntryDTO[]; username: string }) {
  return (
    <section className={cn(card, "flex flex-col gap-4 p-6")} aria-labelledby="guestbook-title">
      <SectionTitle
        eyebrow="Guestbook"
        title={<span id="guestbook-title">다녀간 친구들</span>}
        action={
          <Link href={`/@${username}/guestbook`} aria-label="방명록 열기" className="text-fg-subtle hover:text-fg">
            <ArrowRight className="size-5" />
          </Link>
        }
      />
      {entries.length > 0 ? (
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <GuestNote key={e.id} entry={e} />
          ))}
        </div>
      ) : (
        <DashedEmpty icon={<MessageCircleHeart />} title="아직 남겨진 인사가 없어요" description={<Link href={`/@${username}/guestbook`} className="underline-offset-2 hover:underline">방명록 열기</Link>} />
      )}
    </section>
  );
}

/* ───────── 이 집의 플레이리스트 ───────── */

export function PlaylistCard({ music, name }: { music: { embed: MusicEmbed; title: string | null; artist: string | null } | null; name: string }) {
  return (
    <section className={cn(card, "flex flex-col gap-4 overflow-hidden p-6")} aria-labelledby="playlist-title">
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b6bff] to-[#6a47f0] text-white shadow-2" aria-hidden>
          <Music2 className="size-6" />
        </span>
        <div className="min-w-0">
          <Eyebrow className="mb-1">Home playlist</Eyebrow>
          <h2 id="playlist-title" className="text-heading font-bold tracking-tight">
            이 집의 플레이리스트
          </h2>
          <p className="mt-1 text-caption text-fg-muted">{music ? (music.title ? `${music.title}${music.artist ? ` · ${music.artist}` : ""}` : "집주인이 고른 음악을 함께 들어 보세요.") : "공간에 BGM을 걸어 두면 놀러 온 친구도 함께 들어요."}</p>
        </div>
      </div>
      {music ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface-muted">
          <iframe
            title={`${name} 플레이리스트`}
            src={music.embed.embedUrl}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
            className={cn("block w-full border-0", music.embed.provider === "spotify" ? "h-[152px]" : "aspect-video")}
          />
        </div>
      ) : (
        <DashedEmpty icon={<Music2 />} title="아직 고른 음악이 없어요" description="YouTube·Spotify 링크를 붙여 넣으면 돼요" action={<ButtonLink href="/settings/space" size="sm" variant="soft">BGM 고르기</ButtonLink>} />
      )}
    </section>
  );
}

/* ───────── 2.5D 집 배너 ───────── */

export function HouseBanner({ username }: { username: string }) {
  return (
    <Link href={`/@${username}/house`} className={cn(card, "group grid overflow-hidden transition-shadow hover:shadow-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]")}>
      <span className="relative block aspect-[16/10] bg-[#f4ecf6] md:aspect-auto md:min-h-64">
        <Image src="/house/poster.webp" alt="아늑한 2.5D 방 미리보기: 침대, 소파, 러그, 책상과 스탠드 조명" fill sizes="(min-width: 768px) 640px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      </span>
      <span className="flex flex-col justify-center gap-2 p-7">
        <Eyebrow>My 2.5D home</Eyebrow>
        <span className="text-[1.6rem] leading-snug font-bold tracking-tight">
          나만의 공간을
          <br />
          꾸며 보세요
        </span>
        <span className="text-caption text-fg-muted">가구 37종을 골라 놓고, 친구가 놀러 오면 방 안에서 함께 만나요.</span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-caption font-bold text-primary">
          <Box className="size-4" /> 집으로 놀러가기 <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
