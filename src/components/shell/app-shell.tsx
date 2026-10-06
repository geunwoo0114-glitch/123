import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { countUnread } from "@/features/notifications/service";
import { countIncomingRequests } from "@/features/relationships/queries";
import { countUnreadConversations } from "@/features/messages/queries";
import { parseAvatar } from "@/features/avatar/schema";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { SideNav, BottomNav } from "./nav";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";

/**
 * 로그인 사용자는 사이드바(데스크톱)/하단 탭(모바일)을, 비로그인 방문자는 가벼운 상단 바를 본다.
 * 비로그인 방문자도 공개 공간을 둘러볼 수 있어야 '놀러 오는' 경험이 공유 링크에서 시작된다.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" aria-label={`${brand.name} 홈`}>
              <Logo />
            </Link>
            <nav className="flex items-center gap-2">
              <ButtonLink href="/login" variant="ghost" size="sm">
                로그인
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">
                내 다락 만들기
              </ButtonLink>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
      </>
    );
  }

  const [unread, requests, profile, dms] = await Promise.all([
    countUnread(user.id),
    countIncomingRequests(user.id),
    db.profile.findUnique({ where: { userId: user.id }, select: { avatar: true } }),
    countUnreadConversations(user.id),
  ]);
  const me = { isAdmin: user.role === "ADMIN", username: user.username, displayName: user.displayName, avatarKey: user.avatarKey, minimi: parseAvatar(profile?.avatar) };

  return (
    <div className="lg:flex">
      <SideNav me={me} unread={unread} requests={requests} dms={dms} />
      <main id="main" className="min-w-0 flex-1">
        {children}
        <div className="mobile-nav-spacer lg:hidden" />
      </main>
      <BottomNav me={me} unread={unread} />
      <RealtimeRefresher />
    </div>
  );
}
