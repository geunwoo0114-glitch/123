import Link from "next/link";
import { notFound } from "next/navigation";
import { NotebookPen, Images, MessageSquareHeart, Users, Sparkles, Footprints } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { serviceDay, formatDay, relativeTime } from "@/lib/dates";
import { getSpace } from "@/features/space/queries";
import { getPostForViewer, listUserPosts } from "@/features/posts/queries";
import { listRecentDiary, onThisDay } from "@/features/diary/queries";
import { recentPhotos } from "@/features/albums/queries";
import { listGuestbook } from "@/features/guestbook/queries";
import { listFriends, getBlockedIds } from "@/features/relationships/queries";
import { recentVisitors } from "@/features/visits/service";
import { promptForDay } from "@/features/diary/schemas";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/misc";
import { PostCard } from "@/components/content/post-card";
import { MiniRoom } from "@/components/space/mini-room";
import { DiaryItem, FriendFaces, GuestNote, MusicWidget, PhotoTiles, Widget, WidgetEmpty } from "@/components/space/widgets";

export default async function SpaceHome({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const viewerId = viewer?.id ?? null;
  const space = await getSpace(username, viewerId);
  if (!space) notFound();
  if (!space.canView || space.relation.state === "BLOCKED") return null;

  const { owner, theme } = space;
  const isOwner = space.relation.state === "SELF";
  const base = `/@${owner.username}`;
  const visible = new Set(theme.widgets.filter((w) => w.visible).map((w) => w.id));
  const today = serviceDay();

  const [posts, pinned, diary, photos, guestbook, friends, visitors, memories] = await Promise.all([
    visible.has("recent") ? listUserPosts(owner.id, viewerId, null, 4) : null,
    space.pinnedPostId ? getPostForViewer(space.pinnedPostId, viewerId) : null,
    visible.has("diary") ? listRecentDiary(owner.id, viewerId, 3) : null,
    visible.has("photos") ? recentPhotos(owner.id, viewerId, 6) : null,
    visible.has("guestbook") ? listGuestbook(owner.id, viewerId, null, 3) : null,
    visible.has("friends") ? listFriends(owner.id, { take: 8 }) : null,
    isOwner || space.showVisitorsPublic ? recentVisitors(owner.id, viewerId ? await getBlockedIds(viewerId) : [], 8) : null,
    isOwner ? onThisDay(owner.id, today) : null,
  ]);

  const widgets: Record<string, React.ReactNode> = {
    intro: (
      <section key="intro" className="space-card overflow-hidden xl:col-span-2" aria-label="미니룸">
        <MiniRoom minimi={owner.minimi} name={owner.displayName} statusMessage={owner.statusMessage ? `${owner.statusEmoji} ${owner.statusMessage}`.trim() : undefined} />
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          {owner.interests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {owner.interests.map((i) => (
                <Tag key={i}>{i}</Tag>
              ))}
            </div>
          ) : (
            <span className="text-caption text-fg-subtle">{owner.displayName}님의 {brand.spaceNoun}에 오신 걸 환영해요</span>
          )}
          {isOwner && (
            <ButtonLink href="/town/closet" variant="soft" size="sm" icon={<Sparkles className="size-4" />}>
              미니미 꾸미기
            </ButtonLink>
          )}
        </div>
      </section>
    ),
    music: space.music ? <MusicWidget key="music" music={space.music} title={owner.displayName} /> : null,
    recent: posts && (
      <section key="recent" className="flex flex-col gap-4 xl:col-span-2" aria-label="최근 소식">
        <div className="flex items-center justify-between">
          <h2 className="text-title font-bold">최근 소식</h2>
          {posts.items.length > 0 && (
            <Link href={`${base}/posts`} className="text-caption font-medium text-fg-muted hover:text-fg">
              모두 보기
            </Link>
          )}
        </div>
        {pinned && <PostCard post={pinned} viewerId={viewerId} pinned showVisitCta={false} isPinnable={isOwner} />}
        {posts.items
          .filter((p) => p.id !== pinned?.id)
          .slice(0, 3)
          .map((p) => (
            <PostCard key={p.id} post={p} viewerId={viewerId} showVisitCta={false} isPinnable={isOwner} />
          ))}
        {posts.items.length === 0 && !pinned && (
          <div className="space-card">
            <WidgetEmpty action={isOwner ? <ButtonLink href="/write" size="sm" variant="accent">첫 소식 남기기</ButtonLink> : undefined}>
              {isOwner ? "아직 남긴 소식이 없어요. 요즘 이야기를 들려주세요." : "아직 남긴 소식이 없어요."}
            </WidgetEmpty>
          </div>
        )}
      </section>
    ),
    diary: diary && (
      <Widget key="diary" title="다이어리" href={`${base}/diary`}>
        {memories && memories.length > 0 && (
          <Link href={`${base}/diary/${memories[0].id}`} className="mb-3 flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2.5 text-caption font-medium text-accent">
            <Sparkles className="size-4 shrink-0" />
            <span className="truncate">
              {Number(memories[0].date.slice(0, 4))}년 오늘, &ldquo;{memories[0].title}&rdquo;
            </span>
          </Link>
        )}
        {diary.length > 0 ? (
          <div className="-mx-2 flex flex-col">
            {diary.map((d) => (
              <DiaryItem key={d.id} entry={d} href={`${base}/diary/${d.id}`} compact />
            ))}
          </div>
        ) : (
          <WidgetEmpty action={isOwner ? <ButtonLink href="/write/diary" size="sm" variant="accent" icon={<NotebookPen className="size-4" />}>오늘 일기 쓰기</ButtonLink> : undefined}>
            {isOwner ? <>오늘의 질문: <b className="text-fg">{promptForDay(today)}</b></> : "공개된 일기가 없어요."}
          </WidgetEmpty>
        )}
      </Widget>
    ),
    photos: photos && (
      <Widget key="photos" title="사진첩" href={`${base}/photos`}>
        {photos.length > 0 ? (
          <PhotoTiles photos={photos} href={`${base}/photos`} />
        ) : (
          <WidgetEmpty action={isOwner ? <ButtonLink href="/write/photos" size="sm" variant="accent" icon={<Images className="size-4" />}>첫 추억 올리기</ButtonLink> : undefined}>
            {isOwner ? "첫 번째 추억을 남겨보세요." : "아직 사진이 없어요."}
          </WidgetEmpty>
        )}
      </Widget>
    ),
    guestbook: guestbook && (
      <Widget key="guestbook" title="방명록" href={`${base}/guestbook`}>
        {guestbook.items.length > 0 ? (
          <div className="flex flex-col gap-3">
            {guestbook.items.map((e) => (
              <GuestNote key={e.id} entry={e} />
            ))}
          </div>
        ) : (
          <WidgetEmpty>{isOwner ? "아직 방명록이 비어 있어요. 친구에게 공간을 공유해 보세요." : "첫 번째 방문 흔적을 남겨보세요!"}</WidgetEmpty>
        )}
        {space.canWriteGuestbook && (
          <ButtonLink href={`${base}/guestbook#write`} variant="accent" size="sm" className="mt-3 w-full" icon={<MessageSquareHeart className="size-4" />}>
            방명록 남기기
          </ButtonLink>
        )}
      </Widget>
    ),
    friends: friends && (
      <Widget key="friends" title={`친구 ${space.counts.friends}`} href={`${base}/friends`}>
        {friends.length > 0 ? (
          <FriendFaces friends={friends} />
        ) : (
          <WidgetEmpty action={isOwner ? <ButtonLink href="/explore" size="sm" variant="accent" icon={<Users className="size-4" />}>친구 찾기</ButtonLink> : undefined}>
            {isOwner ? "새로운 친구를 찾아보세요." : "아직 친구가 없어요."}
          </WidgetEmpty>
        )}
      </Widget>
    ),
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {theme.widgets.filter((w) => w.visible).map((w) => widgets[w.id])}
      {visitors && (
        <Widget title="최근 다녀간 사람" className="xl:col-span-2">
          {visitors.length > 0 ? (
            <ul className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1">
              {visitors.map((v) => (
                <li key={v.id} className="w-16 shrink-0 text-center">
                  <Link href={`/@${v.username}`} className="flex flex-col items-center gap-1">
                    <Avatar name={v.displayName} avatarKey={v.avatarKey} minimi={v.minimi} size="lg" />
                    <span className="w-full truncate text-label font-medium">{v.displayName}</span>
                    <span className="text-[11px] text-fg-subtle">{relativeTime(v.lastAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-caption text-fg-muted">
              <Footprints className="size-4" /> 최근 14일 동안 흔적을 남긴 방문자가 없어요.
            </p>
          )}
          {isOwner && <p className="mt-3 text-label text-fg-subtle">방문 흔적은 방문자가 허용한 경우에만 남아요. {!space.showVisitorsPublic && "지금은 나만 볼 수 있어요."} · 오늘 {formatDay(today)}</p>}
        </Widget>
      )}
    </div>
  );
}
