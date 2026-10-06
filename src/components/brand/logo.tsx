import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

/** 다락 로고: 지붕 아래 작은 창문 — '나만의 작은 방' */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <path d="M4 15.5 16 5l12 10.5V26a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z" fill="var(--primary)" />
      <rect x="11.5" y="15" width="9" height="8" rx="2.2" fill="#fff" />
      <path d="M16 15v8M11.5 19h9" stroke="var(--primary)" strokeWidth="1.4" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[1.375rem] font-extrabold tracking-tight text-fg">{brand.name}</span>
    </span>
  );
}
