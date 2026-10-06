"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStatus } from "@/features/space/actions";
import { useToast } from "@/components/ui/toast";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/cn";

const quickEmojis = ["☕", "✈️", "😴", "📚", "🎧", "🏃", "🍀", "🔥", "🌧️", "🎉"];

/** 상태 메시지 인라인 편집 (공간 주인만) */
export function StatusEditor({ message, emoji, className }: { message: string; emoji: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message);
  const [em, setEm] = useState(emoji);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function save() {
    start(async () => {
      const res = await updateStatus({ statusMessage: text, statusEmoji: em });
      if (res.ok) {
        setEditing(false);
        toast(res.message ?? "저장했어요.");
        router.refresh();
      } else toast(res.error, "error");
    });
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className={cn("group w-full text-left", className)} aria-label="상태 메시지 바꾸기">
        <span className={cn("block rounded-md px-3 py-2 text-body transition-colors group-hover:bg-surface-muted", !message && "text-fg-subtle")}>
          {message ? `${emoji} ${message}`.trim() : "지금 어떤 상태인가요? 눌러서 남겨보세요"}
        </span>
      </button>
    );
  }
  return (
    <form
      className={cn("flex flex-col gap-2 rounded-md border border-line-strong bg-surface p-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-wrap gap-1">
        {quickEmojis.map((q) => (
          <button key={q} type="button" onClick={() => setEm(em === q ? "" : q)} aria-pressed={em === q} className={cn("size-8 rounded-full text-[18px] hover:bg-surface-muted", em === q && "bg-accent-soft")}>
            {q}
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={appConfig.limits.statusMessage}
        placeholder="예: 오늘도 열심히, 여행 중, 잠수 중"
        aria-label="상태 메시지"
        className="h-10 rounded-sm bg-surface-muted px-3 outline-none focus:ring-2 focus:ring-[var(--focus)]"
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
      />
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => setEditing(false)} className="h-8 rounded-sm px-3 text-caption text-fg-muted hover:bg-surface-muted">
          취소
        </button>
        <button type="submit" disabled={pending} className="h-8 rounded-sm bg-accent px-3 text-caption font-semibold text-on-accent disabled:opacity-50">
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
