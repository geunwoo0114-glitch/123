"use client";

import { Globe2, Lock, Star, Users } from "lucide-react";
import type { Visibility } from "@/features/privacy/policy";
import { visibilityLabels } from "@/features/privacy/policy";
import { cn } from "@/lib/cn";

export const visibilityIcons = { PUBLIC: Globe2, FRIENDS: Users, CLOSE_FRIENDS: Star, PRIVATE: Lock } as const;

export function VisibilityIcon({ value, className }: { value: Visibility; className?: string }) {
  const Icon = visibilityIcons[value];
  return <Icon className={cn("size-3.5", className)} aria-label={visibilityLabels[value]} />;
}

/** 공개 범위 선택 (세그먼트) */
export function VisibilityPicker({
  value,
  onChange,
  options = ["PUBLIC", "FRIENDS", "CLOSE_FRIENDS", "PRIVATE"],
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  options?: Visibility[];
}) {
  return (
    <div role="radiogroup" aria-label="공개 범위" className="flex flex-wrap gap-1.5">
      {options.map((v) => {
        const Icon = visibilityIcons[v];
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-caption font-medium transition-colors",
              active ? "border-fg bg-fg text-bg" : "border-line-strong text-fg-muted hover:bg-surface-muted",
            )}
          >
            <Icon className="size-3.5" />
            {visibilityLabels[v]}
          </button>
        );
      })}
    </div>
  );
}
