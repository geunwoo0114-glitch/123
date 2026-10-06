"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { brand } from "@/config/brand";

export function GameResult({ score, label, reward, message, onRetry }: { score: number; label: string; reward: number; message: string; onRetry: () => void }) {
  return (
    <div className="animate-fade-up space-card flex flex-col items-center gap-2 p-6 text-center" role="status">
      <p className="text-caption text-fg-muted">{label}</p>
      <p className="text-display font-bold tabular-nums">{score}</p>
      <p className="text-title font-bold text-primary">
        {reward > 0 ? `${brand.currency.emoji} +${reward}` : "보상 없음"}
      </p>
      <p className="text-caption text-fg-muted">{message}</p>
      <div className="mt-3 flex gap-2">
        <Button onClick={onRetry}>한 판 더</Button>
        <ButtonLink href="/town/shop" variant="secondary">
          상점 가기
        </ButtonLink>
      </div>
    </div>
  );
}
