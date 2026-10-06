import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** 월간 캘린더: 일기가 있는 날에 점을 찍는다 (서버 컴포넌트) */
export function DiaryCalendar({ month, days, base, today }: { month: string; days: string[]; base: string; today: string }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const has = new Set(days);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  return (
    <div className="space-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link href={`${base}?month=${prev}`} scroll={false} aria-label="이전 달" className="rounded-full p-2 hover:bg-surface-muted">
          <ChevronLeft className="size-5" />
        </Link>
        <p className="text-title font-bold">
          {y}년 {m}월
        </p>
        <Link href={`${base}?month=${next}`} scroll={false} aria-label="다음 달" className="rounded-full p-2 hover:bg-surface-muted">
          <ChevronRight className="size-5" />
        </Link>
      </div>
      <div className="grid grid-cols-7 text-center text-label text-fg-subtle" aria-hidden>
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const day = `${month}-${String(d).padStart(2, "0")}`;
          return (
            <span key={day} className={cn("relative mx-auto flex size-9 flex-col items-center justify-center rounded-full text-caption", day === today && "bg-fg font-bold text-bg", has.has(day) && day !== today && "font-semibold text-accent")}>
              {d}
              {has.has(day) && <span className="absolute bottom-1 size-1 rounded-full bg-accent" aria-label="일기 있음" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
