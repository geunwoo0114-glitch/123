"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/town", label: "광장", emoji: "🎪" },
  { href: "/town/shop", label: "상점", emoji: "🛍️" },
  { href: "/town/closet", label: "옷장", emoji: "🪞" },
];

export function TownTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="타운 메뉴" className="flex gap-2">
      {tabs.map((t) => {
        const active = t.href === "/town" ? pathname === "/town" || pathname.startsWith("/town/play") : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-4 font-semibold transition-colors", active ? "bg-fg text-bg" : "bg-surface text-fg-muted hover:bg-surface-muted")}
          >
            <span aria-hidden>{t.emoji}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
