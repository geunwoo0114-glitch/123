"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function SpaceTabs({ username, counts }: { username: string; counts?: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  const base = `/@${username}`;
  const tabs = [
    { href: base, key: "home", label: "홈" },
    { href: `${base}/posts`, key: "posts", label: "소식" },
    { href: `${base}/diary`, key: "diary", label: "다이어리" },
    { href: `${base}/photos`, key: "photos", label: "사진첩" },
    { href: `${base}/guestbook`, key: "guestbook", label: "방명록" },
    { href: `${base}/friends`, key: "friends", label: "친구" },
  ];
  // rewrite 때문에 /@username 과 /u/username 둘 다 올 수 있다
  const rel = pathname.replace(/^\/(@|u\/)[^/]+/, "");
  const active = (key: string) => (key === "home" ? rel === "" || rel === "/" : rel.startsWith(`/${key}`));
  return (
    <nav aria-label="공간 메뉴" className="sticky top-14 z-20 -mx-4 border-b border-line bg-[color-mix(in_srgb,var(--space-surface-tint)_92%,transparent)] px-4 backdrop-blur lg:top-0 lg:mx-0 lg:rounded-t-lg lg:px-2">
      <ul className="flex gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              scroll={false}
              aria-current={active(t.key) ? "page" : undefined}
              className={cn(
                "relative flex h-12 items-center gap-1 px-3 text-body font-semibold whitespace-nowrap transition-colors",
                active(t.key) ? "text-fg after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-full after:bg-accent" : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              {t.label}
              {counts?.[t.key] ? <span className="text-label text-fg-subtle tabular-nums">{counts[t.key]}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
