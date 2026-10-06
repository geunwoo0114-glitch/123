import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

/** 다락 로고: 둥근 보라 타일 안의 작은 집 — '나만의 작은 방' */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      {/* 같은 페이지에 로고가 여러 번(숨김 포함) 나와도 깨지지 않게 그라디언트 id 대신 단색 */}
      <rect width="32" height="32" rx="9" fill="#7653f5" />
      <path d="M8 15.5 16 8.5l8 7V23a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2Z" fill="#fff" />
      <rect x="13.4" y="17.2" width="5.2" height="5" rx="1.4" fill="#7653f5" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[1.3rem] font-extrabold tracking-tight text-fg">{brand.name}</span>
    </span>
  );
}
