import Link from "next/link";
import { redirect } from "next/navigation";
import { Box, Gamepad2, Mail, Sparkles, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { serviceDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { getFriendsStatusStrip, getHomeFeed, type FeedItem } from "@/features/feed/queries";
import { diaryDaysInMonth, listRecentDiary } from "@/features/diary/queries";
import { listGuestbook } from "@/features/guestbook/queries";
import { getSpace } from "@/features/space/queries";
import { suggestFriends, countIncomingRequests, countFriends } from "@/features/relationships/queries";
import { visitStats } from "@/features/visits/service";
import { countUnreadConversations } from "@/features/messages/queries";
import { getWallet } from "@/features/town/service";
import { promptForDay } from "@/features/diary/schemas";
import { userCardSelect, toUserCard } from "@/features/users/card";
import { brand } from "@/config/brand";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, SectionHeader } from "@/components/ui/misc";
import { MobileTopBar } from "@/components/shell/nav";
import { FeedList } from "@/components/home/feed-list";
import { StatusStrip } from "@/components/home/status-strip";
import { SuggestionList } from "@/components/home/suggestions";
import { Landing } from "@/components/home/landing";
import { InstallCard } from "@/components/pwa/install-card";
import { VerifyBanner } from "@/components/home/verify-banner";
import { GuestbookCard, HouseBanner, MemoriesSection, MomentCard, PlaylistCard, ProfileCard, type Moment } from "@/components/home/dashboard";
import { DiaryCalendar } from "@/components/space/diary-calendar";
import { Eyebrow, SectionTitle } from "@/components/ui/section";

const iconLink = "flex size-10 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted";

/** 시간대별 인사 (KST) */
function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour >= 5 && hour < 11) return "좋은 아침이에요";
  if (hour >= 11 && hour < 17) return "오늘도 반가워요";
  if (hour >= 17 && hour < 22) return "좋은 저녁이에요";
  return "편안한 밤 보내세요";
}

/** 피드에서 사진이 있는 가장 최근 순간 */
function pickMoment(items: FeedItem[]): Moment | null {
  for (const it of items) {
    if (it.kind === "post" && it.post.images[0]) {
      const img = it.post.images[0];
      return { href: `/p/${it.post.id}`, image: { key: img.key, dominant: img.dominant, alt: img.alt || "소식 사진" }, text: it.post.body.split("\n")[0].slice(0, 60), author: it.post.author, at: it.at, mood: it.post.mood };
    }
    if (it.kind === "photos" && it.album.recent[0]) {
      const img = it.album.recent[0];
      return { href: `/@${it.author.username}/photos/${it.album.id}`, image: { key: img.key, dominant: img.dominant, alt: `${it.album.title} 사진` }, text: it.album.title, author: it.author, at: it.at, mood: null };
    }
  }
  return null;
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  if (!user) return <Landing />;
  if (!user.onboarded) redirect("/onboarding");
  const sp = await searchParams;
  const today = serviceDay();
  const month = typeof sp.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : today.slice(0, 7);

  const [meRow, feed, strip, suggestions, stats, wallet, requests, dms, diaryDays, recentDiary, guestbook, space, friendCount] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { ...userCardSelect, email: true, emailVerifiedAt: true } }),
    getHomeFeed(user.id),
    getFriendsStatusStrip(user.id),
    suggestFriends(user.id, 5),
    visitStats(user.id),
    getWallet(user.id),
    countIncomingRequests(user.id),
    countUnreadConversations(user.id),
    diaryDaysInMonth(user.id, user.id, month),
    listRecentDiary(user.id, user.id, 3),
    listGuestbook(user.id, user.id, null, 2),
    getSpace(user.username, user.id),
    countFriends(user.id),
  ]);
  const me = toUserCard(meRow);
  const prompt = promptForDay(today);
  const moment = pickMoment(feed.items);
  const dateLabel = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date()).replace(/\.? (\S+요일)$/, " · $1");

  return (
    <>
      <MobileTopBar
        actions={
          <>
            <Link href="/town" aria-label={brand.townName} className={iconLink}>
              <Gamepad2 className="size-5" />
            </Link>
            <Link href="/messages" className={`relative ${iconLink}`} aria-label={`쪽지${dms ? `, 안 읽은 대화 ${dms}개` : ""}`}>
              <Mail className="size-5" />
              {dms > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
            </Link>
            <Link href="/friends" className={`relative ${iconLink}`} aria-label={`친구${requests ? `, 받은 신청 ${requests}개` : ""}`}>
              <Users className="size-5" />
              {requests > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
            </Link>
          </>
        }
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-4 pb-14 lg:px-6 lg:pt-10">
        {/* 인사 */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow className="mb-2">{dateLabel}</Eyebrow>
            <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-balance sm:text-[2.25rem]">
              {greeting()}, {me.displayName}님 <span aria-hidden>☺︎</span>
            </h1>
            <p className="mt-1.5 text-body text-fg-muted">작은 순간들이 모여 나만의 이야기가 돼요.</p>
          </div>
          <div className="flex gap-2">
            <ButtonLink href={`/@${me.username}/house`} variant="secondary" className="rounded-full" icon={<Box className="size-4" />}>
              2.5D 집
            </ButtonLink>
            <ButtonLink href="/settings/space" className="rounded-full shadow-2" icon={<Sparkles className="size-4" />}>
              내 공간 꾸미기
            </ButtonLink>
          </div>
        </header>

        {!meRow.emailVerifiedAt ? <VerifyBanner email={meRow.email} /> : <InstallCard />}

        {/* 프로필 · 오늘의 순간 · 캘린더 */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          <ProfileCard me={me} stats={stats} friends={friendCount} />
          <div className="md:col-span-2 md:row-start-1 lg:col-span-1 lg:col-start-2">
            <MomentCard moment={moment} prompt={prompt} />
          </div>
          <DiaryCalendar month={month} days={diaryDays} base="/" today={today} eyebrow="My calendar" dayHref="/write/diary" />
        </div>

        <MemoriesSection entries={recentDiary} username={me.username} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <GuestbookCard entries={guestbook.items} username={me.username} />
          <PlaylistCard music={space?.music ?? null} name={me.displayName} />
        </div>

        <HouseBanner username={me.username} />

        {/* 친구 소식 */}
        <div className="flex justify-between gap-8">
          <section className="w-full max-w-[680px] min-w-0 flex-1" aria-labelledby="news-title">
            <SectionTitle eyebrow="Friends' news" title={<span id="news-title">친구들의 소식</span>} className="mb-4" />
            <StatusStrip me={me} friends={strip} />
            <Link href="/write" className="space-card mt-4 flex items-center gap-3 p-4 transition-shadow hover:shadow-3">
              <Avatar name={me.displayName} avatarKey={me.avatarKey} minimi={me.minimi} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-label font-semibold text-primary">오늘의 질문</span>
                <span className="block truncate text-fg-muted">{prompt}</span>
              </span>
            </Link>
            <div className="mt-4">
              {feed.items.length > 0 ? (
                <FeedList initial={feed.items} nextCursor={feed.nextCursor} viewerId={user.id} />
              ) : (
                <div className="space-card">
                  <EmptyState
                    icon={<Users />}
                    title={feed.peopleCount === 0 ? "친구가 생기면 여기에 소식이 쌓여요" : "아직 새 소식이 없어요"}
                    description={feed.peopleCount === 0 ? "아는 사람을 찾아 친구 신청을 보내 보세요. 친구의 공간에 놀러 가는 게 다락의 시작이에요." : "먼저 소식을 남겨 보는 건 어때요?"}
                    action={<ButtonLink href={feed.peopleCount === 0 ? "/explore" : "/write"}>{feed.peopleCount === 0 ? "친구 찾기" : "소식 남기기"}</ButtonLink>}
                  />
                  {suggestions.length > 0 && (
                    <div className="border-t border-line px-4 py-3 xl:hidden">
                      <SectionHeader title="이런 사람은 어때요?" />
                      <SuggestionList users={suggestions} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="hidden w-[300px] shrink-0 flex-col gap-4 lg:flex" aria-label="타운과 친구 추천">
            <Link href="/town" className="space-card flex items-center gap-3 p-4 hover:shadow-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-warning-soft text-[22px]" aria-hidden>
                {brand.currency.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{brand.townName}</span>
                <span className="block text-caption text-fg-muted">{wallet.attendedToday ? `${brand.currency.name} ${wallet.coins}개 보유` : "오늘 출석하고 밤톨 받기!"}</span>
              </span>
            </Link>
            {suggestions.length > 0 && (
              <div className="space-card p-4">
                <SectionHeader title="친구 추천" action={<Link href="/explore" className="text-caption text-fg-muted hover:text-fg">더 보기</Link>} />
                <SuggestionList users={suggestions} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
