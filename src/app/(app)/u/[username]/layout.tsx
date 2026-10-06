import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSpace } from "@/features/space/queries";
import { themeStyle } from "@/features/space/themes";
import { recordVisit, visitRequestInfo, visitStats } from "@/features/visits/service";
import { countGuestbook } from "@/features/guestbook/queries";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/misc";
import { MobileTopBar } from "@/components/shell/nav";
import { RelationActions } from "@/components/space/relation-actions";
import { StatusEditor } from "@/components/space/status-editor";
import { SpaceTabs } from "@/components/space/space-tabs";
import { ShareButton } from "@/components/space/share-button";
import { MediaImage } from "@/components/media/photo-grid";
import { CompactOnSubpage } from "@/components/space/compact-on-subpage";

export async function generateMetadata({ params }: LayoutProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space) return { title: "공간을 찾을 수 없어요" };
  const { owner } = space;
  const title = `${owner.displayName}(@${owner.username})의 ${brand.spaceNoun}`;
  const description = owner.statusMessage || owner.bio || `${owner.displayName}님의 공간에 놀러 오세요.`;
  return {
    title,
    description,
    alternates: { canonical: `/@${owner.username}` },
    openGraph: { title, description, url: `/@${owner.username}`, type: "profile" },
    // 비공개 공간은 검색 엔진에 노출하지 않는다
    robots: space.canView && space.relation.state !== "BLOCKED" ? undefined : { index: false },
  };
}

function VisitCounter({ today, total }: { today: number; total: number }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-label font-semibold tracking-wide text-fg-muted tabular-nums" aria-label={`오늘 방문 ${today}명, 전체 방문 ${total}명`}>
      <span>
        TODAY <span className="text-accent">{today.toLocaleString()}</span>
      </span>
      <span className="h-3 w-px bg-line-strong" aria-hidden />
      <span>TOTAL {total.toLocaleString()}</span>
    </p>
  );
}

export default async function SpaceLayout({ children, params }: LayoutProps<"/u/[username]">) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space) notFound();

  const { owner, theme, relation } = space;
  const isOwner = relation.state === "SELF";
  // 방문 기록은 응답을 보낸 뒤에 처리해 렌더링을 막지 않는다
  if (space.canView) {
    const req = await visitRequestInfo();
    after(() => recordVisit(owner.id, viewer?.id ?? null, req));
  }
  const [stats, guestbookCount] = await Promise.all([visitStats(owner.id), countGuestbook(owner.id)]);

  const profile = (
    <div className="flex flex-col gap-4">
      <div className={cn("flex gap-4", theme.layoutVariant === "cover" ? "items-end" : "items-center lg:flex-col lg:items-start")}>
        <Avatar
          name={owner.displayName}
          avatarKey={owner.avatarKey}
          minimi={owner.minimi}
          size={theme.layoutVariant === "cover" ? "2xl" : "xl"}
          className={cn("shadow-2 ring-4 ring-surface", theme.layoutVariant === "cover" && "-mt-14 lg:-mt-16")}
        />
        <div className="min-w-0">
          <h1 className="text-heading font-bold break-keep">{owner.displayName}</h1>
          <p className="text-caption text-fg-subtle">@{owner.username}</p>
          {space.friendLabel && (
            <Badge tone="accent" className="mt-1.5">
              내 {space.friendLabel}
            </Badge>
          )}
          {relation.isCloseFriend && !space.friendLabel && <Badge tone="accent" className="mt-1.5">친한 친구</Badge>}
        </div>
      </div>

      {isOwner ? (
        <StatusEditor message={owner.statusMessage} emoji={owner.statusEmoji} className="-mx-3" />
      ) : (
        owner.statusMessage && (
          <p className="relative w-fit max-w-full rounded-2xl rounded-tl-sm bg-accent-soft px-3.5 py-2 text-body text-fg">
            {owner.statusEmoji} {owner.statusMessage}
          </p>
        )
      )}

      {space.canView && owner.bio && <p className="hide-compact text-body whitespace-pre-wrap text-fg-muted">{owner.bio}</p>}

      <div className="hide-compact flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-fg-muted">
        <span>
          친구 <b className="text-fg tabular-nums">{space.counts.friends}</b>
        </span>
        <span>
          소식 받는 사람 <b className="text-fg tabular-nums">{space.counts.followers}</b>
        </span>
      </div>
      <div className="hide-compact">
        <VisitCounter today={stats.today} total={stats.total} />
      </div>

      <div className="hide-compact">
        <RelationActions ownerId={owner.id} ownerName={owner.displayName} ownerUsername={owner.username} relation={relation} friendLabel={space.friendLabel} loggedIn={!!viewer} canMessage={space.canMessage} />
      </div>
    </div>
  );

  const locked = !space.canView || relation.state === "BLOCKED";

  return (
    <div
      data-card={theme.cardStyle}
      style={themeStyle(theme.themeId) as React.CSSProperties}
      className={cn("space-scope space-bg min-h-dvh", `space-bg-${theme.backgroundId}`)}
    >
      <MobileTopBar
        title={<span className="text-body">@{owner.username}</span>}
        actions={<ShareButton url={`/@${owner.username}`} title={`${owner.displayName}의 ${brand.spaceNoun}`} />}
      />
      {theme.layoutVariant === "cover" && (
        <div className={cn("relative overflow-hidden bg-accent-soft", owner.cover ? "h-40 sm:h-56 lg:h-64" : "h-24 sm:h-32")}>
          {owner.cover && <MediaImage media={owner.cover} alt={`${owner.displayName}의 커버 사진`} className="size-full" sizes="100vw" />}
        </div>
      )}
      <div className={cn("mx-auto max-w-6xl px-4 pb-10", theme.layoutVariant === "cover" ? "pt-0" : "pt-5 lg:pt-8")}>
        <div className={cn(theme.layoutVariant === "classic" ? "lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6" : "")}>
          <CompactOnSubpage className={cn("space-card mb-4 p-5", theme.layoutVariant === "classic" ? "lg:sticky lg:top-22 lg:mb-0 lg:self-start" : "-mt-6 relative lg:mx-auto lg:max-w-3xl")}>
            {theme.layoutVariant === "classic" && owner.cover && (
              <div className="-mx-5 -mt-5 mb-4 h-24 overflow-hidden rounded-t-[inherit]">
                <MediaImage media={owner.cover} alt="" className="size-full" sizes="300px" />
              </div>
            )}
            {profile}
            <div className="mt-4 hidden justify-end lg:flex">
              <ShareButton url={`/@${owner.username}`} title={`${owner.displayName}의 ${brand.spaceNoun}`} withLabel />
            </div>
          </CompactOnSubpage>
          <div className={cn("min-w-0", theme.layoutVariant === "cover" && "lg:mx-auto lg:max-w-3xl")}>
            {locked ? (
              <div className="space-card flex flex-col items-center gap-3 px-6 py-16 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Lock className="size-6" />
                </span>
                <p className="text-title font-bold">
                  {relation.state === "BLOCKED" ? "차단한 사용자예요" : `${owner.displayName}님의 ${brand.spaceNoun}은 친구에게만 열려 있어요`}
                </p>
                <p className="text-caption text-fg-muted">
                  {relation.state === "BLOCKED" ? "차단을 해제하면 다시 볼 수 있어요." : "친구 신청을 보내고 수락되면 놀러 갈 수 있어요."}
                </p>
              </div>
            ) : (
              <>
                <SpaceTabs username={owner.username} counts={{ guestbook: guestbookCount, friends: space.counts.friends }} />
                <div className="pt-4">{children}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

