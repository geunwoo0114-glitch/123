import Link from "next/link";
import { redirect } from "next/navigation";
import { Gamepad2, Mail, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { serviceDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { getFriendsStatusStrip, getHomeFeed } from "@/features/feed/queries";
import { suggestFriends, countIncomingRequests } from "@/features/relationships/queries";
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

const iconLink = "flex size-10 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;
  if (!user.onboarded) redirect("/onboarding");

  const [meRow, feed, strip, suggestions, stats, wallet, requests, dms] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { ...userCardSelect, email: true, emailVerifiedAt: true } }),
    getHomeFeed(user.id),
    getFriendsStatusStrip(user.id),
    suggestFriends(user.id, 5),
    visitStats(user.id),
    getWallet(user.id),
    countIncomingRequests(user.id),
    countUnreadConversations(user.id),
  ]);
  const me = toUserCard(meRow);
  const prompt = promptForDay(serviceDay());

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
      <div className="mx-auto flex max-w-6xl gap-8 px-4 pt-2 pb-10 lg:pt-6">
        <div className="mx-auto w-full max-w-[600px] min-w-0">
          <StatusStrip me={me} friends={strip} />
          {!meRow.emailVerifiedAt ? <VerifyBanner email={meRow.email} /> : <InstallCard />}

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
        </div>

        <aside className="hidden w-[300px] shrink-0 flex-col gap-4 xl:flex" aria-label="내 공간 요약">
          <div className="space-card p-4">
            <Link href={`/@${me.username}`} className="flex items-center gap-3">
              <Avatar name={me.displayName} avatarKey={me.avatarKey} minimi={me.minimi} size="lg" />
              <span className="min-w-0">
                <span className="block truncate font-bold">내 {brand.spaceNoun}</span>
                <span className="block truncate text-caption text-fg-muted">@{me.username}</span>
              </span>
            </Link>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-surface-muted py-2">
                <dt className="text-label text-fg-subtle">오늘 방문</dt>
                <dd className="text-title font-bold tabular-nums">{stats.today}</dd>
              </div>
              <div className="rounded-md bg-surface-muted py-2">
                <dt className="text-label text-fg-subtle">전체 방문</dt>
                <dd className="text-title font-bold tabular-nums">{stats.total.toLocaleString()}</dd>
              </div>
            </dl>
          </div>
          <Link href="/town" className="space-card flex items-center gap-3 p-4 hover:shadow-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-[22px]" aria-hidden>
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
    </>
  );
}
