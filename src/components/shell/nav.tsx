"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, Compass, Home, PenLine, Settings, Users, BookHeart, Images, NotebookPen, LogOut, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";
import { Dialog } from "@/components/ui/dialog";
import { logoutAction } from "@/features/users/auth-actions";
import type { AvatarConfig } from "@/features/avatar/schema";
import { brand } from "@/config/brand";

type Me = { username: string; displayName: string; avatarKey: string | null; minimi: AvatarConfig | null };

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

export function SideNav({ me, unread, requests }: { me: Me; unread: number; requests: number }) {
  const isActive = useActive();
  const [compose, setCompose] = useState(false);
  const items = [
    { href: "/", label: "홈", icon: Home },
    { href: "/explore", label: "둘러보기", icon: Compass },
    { href: "/friends", label: "친구", icon: Users, count: requests },
    { href: "/notifications", label: "알림", icon: Bell, count: unread },
    { href: "/town", label: brand.townName, icon: Gamepad2 },
    { href: `/@${me.username}`, match: `/u/${me.username}`, label: `내 ${brand.spaceNoun}`, icon: BookHeart },
  ];
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
      <Link href="/" className="mb-6 px-3" aria-label={`${brand.name} 홈`}>
        <Logo />
      </Link>
      <nav aria-label="주요 메뉴" className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(item.href) || (item.match ? isActive(item.match) : false);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 font-medium transition-colors",
                active ? "bg-surface-muted font-bold text-fg" : "text-fg-muted hover:bg-surface-muted hover:text-fg",
              )}
            >
              <item.icon className="size-5.5" strokeWidth={active ? 2.4 : 2} />
              <span className="flex-1">{item.label}</span>
              <CountDot count={item.count ?? 0} />
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => setCompose(true)}
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-md bg-primary font-semibold text-on-primary shadow-1 transition hover:bg-primary-hover active:scale-[0.98]"
      >
        <PenLine className="size-4.5" /> 기록하기
      </button>
      <div className="mt-auto flex items-center gap-2 rounded-md p-2">
        <Link href={`/@${me.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={me.displayName} avatarKey={me.avatarKey} minimi={me.minimi} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-caption font-semibold">{me.displayName}</span>
            <span className="block truncate text-label text-fg-subtle">@{me.username}</span>
          </span>
        </Link>
        <Link href="/settings" aria-label="설정" className="rounded-full p-2 text-fg-muted hover:bg-surface-muted">
          <Settings className="size-5" />
        </Link>
        <form action={logoutAction}>
          <button type="submit" aria-label="로그아웃" className="rounded-full p-2 text-fg-muted hover:bg-surface-muted">
            <LogOut className="size-5" />
          </button>
        </form>
      </div>
      <ComposeDialog open={compose} onClose={() => setCompose(false)} />
    </aside>
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
