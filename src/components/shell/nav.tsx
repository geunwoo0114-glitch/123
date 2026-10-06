"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Box, Compass, Home, PenLine, Search, Settings, Users, BookHeart, Images, NotebookPen, LogOut, Gamepad2, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";
import { Dialog } from "@/components/ui/dialog";
import { logoutAction } from "@/features/users/auth-actions";
import type { AvatarConfig } from "@/features/avatar/schema";
import { brand } from "@/config/brand";

type Me = { isAdmin?: boolean; username: string; displayName: string; avatarKey: string | null; minimi: AvatarConfig | null };

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
}

function CountDot({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn("min-w-4.5 rounded-full bg-primary px-1 text-center text-[10px] leading-4.5 font-bold text-on-primary", className)} aria-label={`${count}개`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

const composeOptions = [
  { href: "/write", icon: PenLine, title: "소식 남기기", desc: "지금 이야기, 사진 몇 장" },
  { href: "/write/diary", icon: NotebookPen, title: "다이어리 쓰기", desc: "오늘을 조용히 기록해요" },
  { href: "/write/photos", icon: Images, title: "사진첩에 올리기", desc: "앨범에 추억을 모아요" },
];

export function ComposeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="무엇을 남겨볼까요?" size="sm">
      <ul className="flex flex-col gap-2 pb-2">
        {composeOptions.map((o) => (
          <li key={o.href}>
            <Link href={o.href} onClick={onClose} className="flex items-center gap-3 rounded-md p-3 transition-colors hover:bg-surface-muted">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <o.icon className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{o.title}</span>
                <span className="block text-caption text-fg-muted">{o.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

export function TopNav({ me, unread, requests, dms, coins }: { me: Me; unread: number; requests: number; dms: number; coins: number }) {
  const isActive = useActive();
  const [compose, setCompose] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const items = [
    { href: "/", label: "홈", icon: Home },
    { href: "/explore", label: "둘러보기", icon: Compass },
    { href: "/friends", label: "친구", icon: Users, count: requests },
    { href: "/messages", label: "쪽지", icon: Mail, count: dms },
    { href: `/@${me.username}/house`, match: `/u/${me.username}/house`, label: "2.5D 집", icon: Box },
    { href: "/town", label: brand.townName, icon: Gamepad2 },
    { href: `/@${me.username}`, match: `/u/${me.username}`, label: `내 ${brand.spaceNoun}`, icon: BookHeart, exact: true },
    ...(me.isAdmin ? [{ href: "/admin", label: "운영", icon: ShieldCheck }] : []),
  ];

  useEffect(() => {
    if (!profileOpen) return;
    const close = (e: MouseEvent) => !profileRef.current?.contains(e.target as Node) && setProfileOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setProfileOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-lg lg:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
        <Link href="/" className="shrink-0" aria-label={`${brand.name} 홈`}>
          <Logo />
        </Link>
        <nav aria-label="주요 메뉴" className="min-w-0 flex-1">
          <ul className="flex items-center gap-0.5">
            {items.map((item) => {
              const matchPath = item.match ?? item.href;
              // '내 다락'은 2.5D 집 페이지에서는 켜지지 않게 한다
              const active = item.exact
                ? (isActive(item.href) || isActive(matchPath)) && !isActive(`/u/${me.username}/house`) && !isActive(`/@${me.username}/house`)
                : isActive(item.href) || isActive(matchPath);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-16 items-center gap-1.5 px-2.5 text-caption font-semibold whitespace-nowrap transition-colors xl:px-3",
                      active ? "text-primary after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:rounded-full after:bg-primary" : "text-fg-muted hover:text-fg",
                    )}
                  >
                    <item.icon className="size-4.5" strokeWidth={active ? 2.4 : 2} />
                    {item.label}
                    <CountDot count={item.count ?? 0} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/town" className="hidden h-9 items-center gap-1.5 rounded-full bg-warning-soft px-3 text-caption font-bold text-warning tabular-nums xl:flex" aria-label={`내 ${brand.currency.name} ${coins}개`}>
            {brand.currency.emoji} {coins.toLocaleString()}
          </Link>
          <button type="button" onClick={() => setCompose(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-caption font-bold text-on-primary shadow-1 transition hover:bg-primary-hover active:scale-[0.98]">
            <PenLine className="size-4" /> 기록하기
          </button>
          <Link href="/explore" aria-label="사람 찾기" className="flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg">
            <Search className="size-5" />
          </Link>
          <Link href="/notifications" aria-label={`알림${unread ? ` ${unread}개` : ""}`} aria-current={isActive("/notifications") ? "page" : undefined} className="relative flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg">
            <Bell className="size-5" />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" aria-hidden />}
          </Link>
          <div ref={profileRef} className="relative">
            <button type="button" aria-label="내 메뉴" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((o) => !o)} className="flex rounded-full ring-2 ring-primary-soft transition hover:ring-primary/40">
              <Avatar name={me.displayName} avatarKey={me.avatarKey} minimi={me.minimi} size="sm" />
            </button>
            {profileOpen && (
              <div role="menu" className="animate-fade-up absolute top-11 right-0 z-50 w-56 overflow-hidden rounded-lg border border-line bg-surface py-1.5 shadow-3">
                <div className="border-b border-line px-4 pt-1.5 pb-2.5">
                  <p className="truncate text-caption font-bold">{me.displayName}</p>
                  <p className="truncate text-label text-fg-subtle">@{me.username}</p>
                </div>
                <Link role="menuitem" href={`/@${me.username}`} onClick={() => setProfileOpen(false)} className="flex h-10 items-center gap-2.5 px-4 text-caption hover:bg-surface-muted">
                  <BookHeart className="size-4" /> 내 {brand.spaceNoun}
                </Link>
                <Link role="menuitem" href="/notifications" onClick={() => setProfileOpen(false)} className="flex h-10 items-center gap-2.5 px-4 text-caption hover:bg-surface-muted">
                  <Bell className="size-4" /> 알림 {unread > 0 && <CountDot count={unread} />}
                </Link>
                <Link role="menuitem" href="/settings" onClick={() => setProfileOpen(false)} className="flex h-10 items-center gap-2.5 px-4 text-caption hover:bg-surface-muted">
                  <Settings className="size-4" /> 설정
                </Link>
                <form action={logoutAction}>
                  <button role="menuitem" type="submit" className="flex h-10 w-full items-center gap-2.5 px-4 text-caption text-danger hover:bg-surface-muted">
                    <LogOut className="size-4" /> 로그아웃
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      <ComposeDialog open={compose} onClose={() => setCompose(false)} />
    </header>
  );
}

export function BottomNav({ me, unread }: { me: Me; unread: number }) {
  const isActive = useActive();
  const [compose, setCompose] = useState(false);
  const mine = isActive(`/u/${me.username}`) || isActive(`/@${me.username}`);
  const tab = "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium";
  return (
    <>
      <nav aria-label="하단 메뉴" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur-lg lg:hidden">
        <div className="flex h-16">
          {[
            { href: "/", label: "홈", icon: Home },
            { href: "/explore", label: "둘러보기", icon: Compass },
          ].map((i) => (
            <Link key={i.href} href={i.href} aria-current={isActive(i.href) ? "page" : undefined} className={cn(tab, isActive(i.href) ? "text-fg" : "text-fg-subtle")}>
              <i.icon className="size-6" strokeWidth={isActive(i.href) ? 2.4 : 1.9} />
              {i.label}
            </Link>
          ))}
          <button type="button" onClick={() => setCompose(true)} className={cn(tab, "text-fg-subtle")} aria-label="기록하기">
            <span className="flex h-9 w-12 items-center justify-center rounded-md bg-primary text-on-primary shadow-1">
              <PenLine className="size-5" />
            </span>
          </button>
          <Link href="/notifications" aria-current={isActive("/notifications") ? "page" : undefined} className={cn(tab, isActive("/notifications") ? "text-fg" : "text-fg-subtle")}>
            <Bell className="size-6" strokeWidth={isActive("/notifications") ? 2.4 : 1.9} />
            <CountDot count={unread} className="absolute top-2 left-1/2 ml-1" />
            알림
          </Link>
          <Link href={`/@${me.username}`} aria-current={mine ? "page" : undefined} className={cn(tab, mine ? "text-fg" : "text-fg-subtle")}>
            <Avatar name={me.displayName} avatarKey={me.avatarKey} minimi={me.minimi} size="xs" className={cn(mine && "ring-2 ring-fg")} />
            내 {brand.spaceNoun}
          </Link>
        </div>
      </nav>
      <ComposeDialog open={compose} onClose={() => setCompose(false)} />
    </>
  );
}

/** 모바일 상단 바 (페이지 제목 + 우측 액션) */
export function MobileTopBar({ title, actions }: { title?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] px-4 backdrop-blur lg:hidden">
      <div className="text-title font-bold">{title ?? <Logo />}</div>
      <div className="flex items-center gap-1">{actions}</div>
    </div>
  );
}
