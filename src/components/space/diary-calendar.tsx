import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** 월간 캘린더: 일기가 있는 날에 점을 찍는다 (서버 컴포넌트) */
export function DiaryCalendar({ month, days, base, today, eyebrow, dayHref }: { month: string; days: string[]; base: string; today: string; eyebrow?: string; dayHref?: string }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const has = new Set(days);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const nav = "flex size-8 items-center justify-center rounded-full bg-surface-muted text-fg-muted hover:bg-primary-soft hover:text-primary";
  return (
    <div className="space-card p-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          {eyebrow && <p className="mb-1 text-[11px] font-bold tracking-[0.16em] text-primary uppercase">{eyebrow}</p>}
          <p className="text-title font-bold">
            {y}년 {m}월
          </p>
        </div>
        <div className="flex gap-1.5">
          <Link href={`${base}?month=${prev}`} scroll={false} aria-label="이전 달" className={nav}>
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={`${base}?month=${next}`} scroll={false} aria-label="다음 달" className={nav}>
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-label text-fg-subtle" aria-hidden>
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
          <span key={d} className={cn("py-1 font-semibold", i === 0 && "text-danger")}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const day = `${month}-${String(d).padStart(2, "0")}`;
          return (
            <span key={day} className={cn("relative mx-auto flex size-9 flex-col items-center justify-center rounded-full text-caption tabular-nums", day === today && "bg-primary font-bold text-on-primary shadow-2", has.has(day) && day !== today && "font-semibold text-accent")}>
              {d}
              {has.has(day) && <span className={cn("absolute bottom-1 size-1 rounded-full", day === today ? "bg-on-primary" : "bg-accent")} aria-label="일기 있음" />}
            </span>
          );
        })}
      </div>
      {month !== today.slice(0, 7) ? (
        <Link href={base} scroll={false} className="mt-3 flex h-9 items-center justify-center rounded-md bg-primary-soft text-caption font-semibold text-primary hover:brightness-95">
          오늘로 돌아가기
        </Link>
      ) : (
        dayHref && (
          <Link href={dayHref} className="mt-3 flex h-9 items-center justify-center rounded-md bg-primary-soft text-caption font-semibold text-primary hover:brightness-95">
            오늘 일기 쓰기
          </Link>
        )
      )}
    </div>
  );
}
