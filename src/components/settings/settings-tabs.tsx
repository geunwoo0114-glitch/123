"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/settings", label: "프로필" },
  { href: "/settings/space", label: "공간 꾸미기" },
  { href: "/settings/privacy", label: "공개 범위 · 알림" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="설정 메뉴" className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={cn("h-9 shrink-0 rounded-full px-4 leading-9 font-semibold", active ? "bg-fg text-bg" : "bg-surface text-fg-muted hover:bg-surface-muted")}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
