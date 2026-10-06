import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children, as: Tag = "div", ...rest }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" | "aside" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("rounded-lg border border-line bg-surface", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "primary" | "accent" | "success" | "warning" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-surface-muted text-fg-muted",
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label font-semibold", tones[tone], className)}>{children}</span>;
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-1 text-caption text-fg-muted">#{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative block overflow-hidden rounded-md bg-surface-muted", className)}>
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {icon && <div className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent [&_svg]:size-6">{icon}</div>}
      <div className="space-y-1">
        <p className="text-title font-bold text-fg">{title}</p>
        {description && <p className="mx-auto max-w-xs text-caption text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({ title, action, description }: { title: ReactNode; action?: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-title font-bold text-fg">{title}</h2>
        {description && <p className="text-caption text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}
