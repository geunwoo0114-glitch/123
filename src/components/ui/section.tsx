import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 섹션 위의 작은 영문 라벨 (예: RECENT MEMORIES) */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.16em] text-primary uppercase", className)}>{children}</p>;
}

/** 라벨 + 제목 + 오른쪽 액션 */
export function SectionTitle({ eyebrow, title, action, as: Tag = "h2", className }: { eyebrow?: string; title: ReactNode; action?: ReactNode; as?: "h1" | "h2" | "h3"; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
        <Tag className="text-heading font-bold tracking-tight">{title}</Tag>
      </div>
      {action}
    </div>
  );
}

/** 점선 테두리 빈 상태 */
export function DashedEmpty({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong px-6 py-10 text-center", className)}>
      {icon && <span className="mb-1 text-primary [&>svg]:size-6">{icon}</span>}
      <p className="font-bold">{title}</p>
      {description && <p className="text-caption text-fg-subtle">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
