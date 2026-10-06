"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean; icon?: ReactNode };

/** 더보기(…) 메뉴: 바깥 클릭/ESC로 닫히고 키보드로 이동 가능 */
export function Menu({ items, label = "더보기", align = "end" }: { items: MenuItem[]; label?: string; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex size-8 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-muted hover:text-fg"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          onKeyDown={(e) => {
            const els = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
            const i = els.indexOf(document.activeElement as HTMLButtonElement);
            if (e.key === "ArrowDown") els[(i + 1) % els.length]?.focus();
            if (e.key === "ArrowUp") els[(i - 1 + els.length) % els.length]?.focus();
          }}
          className={cn(
            "animate-fade-up absolute top-9 z-30 min-w-40 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-3",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-caption font-medium outline-none hover:bg-surface-muted focus:bg-surface-muted",
                item.danger ? "text-danger" : "text-fg",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
