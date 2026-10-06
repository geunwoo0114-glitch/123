import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getWallet } from "@/features/town/service";
import { economy, gameIds, games } from "@/features/town/games";
import { brand } from "@/config/brand";
import { AttendanceCard } from "@/components/town/attendance-card";

export default async function TownPlaza() {
  const me = await requireOnboardedUser("/town");
  const wallet = await getWallet(me.id);
  const pct = Math.min(100, Math.round((wallet.gameEarnedToday / economy.dailyGameCap) * 100));
  const c = brand.currency;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AttendanceCard attended={wallet.attendedToday} streak={wallet.streak} reward={economy.attendance} streakDays={economy.streakDays} streakBonus={economy.attendanceStreakBonus} />

      <section className="space-card p-5" aria-label="오늘의 게임 보상">
        <h2 className="text-title font-bold">오늘 게임으로 모은 {c.name}</h2>
        <p className="mt-1 text-caption text-fg-muted">
          하루 {economy.dailyGameCap}개까지 모을 수 있어요. 다 모아도 게임은 계속 즐길 수 있어요.
        </p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={economy.dailyGameCap} aria-valuenow={wallet.gameEarnedToday}>
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-right text-caption font-semibold tabular-nums">
          {c.emoji} {wallet.gameEarnedToday} / {economy.dailyGameCap}
        </p>
      </section>

      <section className="md:col-span-2" aria-label="미니게임">
        <h2 className="mb-3 text-title font-bold">미니게임</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {gameIds.map((id) => {
            const g = games[id];
            return (
              <li key={id}>
                <Link href={`/town/play/${id}`} className="space-card group flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[34px]" aria-hidden>
                    {g.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-title font-bold group-hover:underline">{g.name}</span>
                    <span className="block text-caption text-fg-muted">{g.description}</span>
                    <span className="mt-1 inline-block text-label font-semibold text-primary">
                      최대 {c.emoji} {g.reward(g.maxScore)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex items-center justify-center rounded-lg border-2 border-dashed border-line-strong p-4 text-caption text-fg-subtle">새 게임 준비 중이에요 🛠️</li>
        </ul>
      </section>
    </div>
  );
}
