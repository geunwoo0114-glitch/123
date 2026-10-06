"use client";

import { usePathname } from "next/navigation";

/** 모바일에서 공간의 하위 탭(방명록 등)일 때 프로필 카드를 접어 본문이 먼저 보이게 한다 */
export function CompactOnSubpage({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const sub = /^\/(@|u\/)[^/]+\/.+/.test(pathname);
  return (
    <aside className={className} data-compact={sub || undefined}>
      {children}
    </aside>
  );
}
