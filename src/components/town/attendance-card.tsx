"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimAttendance } from "@/features/town/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

export function AttendanceCard({ attended, streak, reward, streakDays, streakBonus }: { attended: boolean; streak: number; reward: number; streakDays: number; streakBonus: number }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const filled = streak % streakDays || (streak > 0 && attended ? streakDays : 0);
  return (
    <section className="space-card p-5" aria-label="출석 체크">
      <h2 className="text-title font-bold">출석 체크</h2>
      <p className="mt-1 text-caption text-fg-muted">
        매일 {brand.currency.emoji} {reward}개, {streakDays}일 연속이면 +{streakBonus}개 보너스!
      </p>
      <ol className="mt-4 flex gap-1.5" aria-label={`연속 ${streak}일`}>
        {Array.from({ length: streakDays }, (_, i) => (
          <li key={i} className={cn("flex h-9 flex-1 items-center justify-center rounded-md text-label font-bold", i < filled ? "bg-primary text-on-primary" : "bg-surface-muted text-fg-subtle")}>
            {i < filled ? brand.currency.emoji : i + 1}
          </li>
        ))}
      </ol>
      <Button
        className="mt-4 w-full"
        disabled={attended}
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await claimAttendance();
            toast(res.ok ? (res.message ?? "출석!") : res.error, res.ok ? "success" : "error");
            router.refresh();
          })
        }
      >
        {attended ? `오늘 출석 완료 · ${streak}일째` : "출석하고 받기"}
      </Button>
    </section>
  );
}
