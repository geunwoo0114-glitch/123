"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * 네이티브 <dialog> 기반 모달. showModal()이 포커스 트랩/ESC/백드롭/inert를 제공한다.
 * 모바일에서는 바텀시트, 데스크톱에서는 가운데 모달로 보인다.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-0 mt-auto w-full max-w-none bg-transparent p-0 text-fg backdrop:bg-[var(--overlay)] sm:m-auto",
        size === "sm" ? "sm:max-w-sm" : size === "md" ? "sm:max-w-lg" : "sm:max-w-2xl",
      )}
    >
      {open && (
        <div className="animate-sheet-up sm:animate-fade-up flex max-h-[90dvh] flex-col rounded-t-xl bg-surface shadow-4 sm:rounded-xl">
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div>
              <h2 id="dialog-title" className="text-title font-bold">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-caption text-fg-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="닫기" className="-mt-1 -mr-2 rounded-full p-2 text-fg-muted hover:bg-surface-muted">
              <X className="size-5" />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-5 pb-4">{children}</div>}
          {footer && <div className="pb-safe flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
