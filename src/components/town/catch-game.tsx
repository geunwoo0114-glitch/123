"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGameSession } from "./use-game-session";
import { GameResult } from "./game-result";

const DURATION = 30;
const BASKET_W = 18; // % of width

type Drop = { id: number; x: number; y: number; speed: number; bad: boolean };

/** 밤톨 줍기: 포인터/터치/방향키로 바구니를 움직여 떨어지는 밤톨을 받는다 */
export function CatchGame() {
  const { begin, end, result, busy } = useGameSession("catch");
  const [playing, setPlaying] = useState(false);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [basket, setBasket] = useState(50);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const field = useRef<HTMLDivElement>(null);
  const state = useRef({ drops: [] as Drop[], basket: 50, score: 0, nextId: 0, last: 0, spawn: 0, startedAt: 0, keys: { l: false, r: false } });

  const finish = useCallback(() => {
    setPlaying(false);
    void end(Math.max(0, state.current.score));
  }, [end]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const s = state.current;
    const tick = (t: number) => {
      const dt = s.last ? Math.min(50, t - s.last) / 1000 : 0;
      s.last = t;
      const elapsed = (performance.now() - s.startedAt) / 1000;
      if (s.keys.l) s.basket = Math.max(BASKET_W / 2, s.basket - 70 * dt);
      if (s.keys.r) s.basket = Math.min(100 - BASKET_W / 2, s.basket + 70 * dt);
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.drops.push({ id: s.nextId++, x: 6 + Math.random() * 88, y: -6, speed: 28 + Math.random() * 22 + elapsed * 1.2, bad: Math.random() < 0.18 });
        s.spawn = Math.max(0.28, 0.75 - elapsed * 0.012);
      }
      const kept: Drop[] = [];
      for (const d of s.drops) {
        d.y += d.speed * dt;
        if (d.y >= 84 && d.y <= 94 && Math.abs(d.x - s.basket) < BASKET_W / 2 + 3) {
          s.score = Math.max(0, s.score + (d.bad ? -3 : 1));
          continue;
        }
        if (d.y < 104) kept.push(d);
      }
      s.drops = kept;
      setDrops([...kept]);
      setBasket(s.basket);
      setScore(s.score);
      setLeft(Math.max(0, Math.ceil(DURATION - elapsed)));
      if (elapsed >= DURATION) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") s.keys.l = true;
      if (e.key === "ArrowRight") s.keys.r = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") s.keys.l = false;
      if (e.key === "ArrowRight") s.keys.r = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [playing, finish]);

  async function start() {
    if (!(await begin())) return;
    Object.assign(state.current, { drops: [], basket: 50, score: 0, last: 0, spawn: 0.5, startedAt: performance.now() });
    setScore(0);
    setLeft(DURATION);
    setPlaying(true);
  }

  function moveTo(clientX: number) {
    const rect = field.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    state.current.basket = Math.min(100 - BASKET_W / 2, Math.max(BASKET_W / 2, pct));
  }

  if (result) return <GameResult score={score} label="받은 밤톨" reward={result.reward} message={result.message} onRetry={start} />;

  return (
    <div>
      <div className="mb-2 flex justify-between text-caption font-semibold tabular-nums" aria-live="off">
        <span>🌰 {score}</span>
        <span>⏱ {left}초</span>
      </div>
      <div
        ref={field}
        onPointerMove={(e) => playing && moveTo(e.clientX)}
        onPointerDown={(e) => playing && moveTo(e.clientX)}
        className="relative h-[min(58dvh,560px)] w-full touch-none overflow-hidden rounded-lg bg-gradient-to-b from-[#cfe7f7] to-[#f6efe2] select-none dark:from-[#1d2a36] dark:to-[#2a241c]"
        role="application"
        aria-label="밤톨 줍기 게임 영역. 좌우 방향키나 손가락으로 바구니를 움직이세요."
      >
        {!playing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/5 text-center">
            <p className="text-[48px]" aria-hidden>
              🧺
            </p>
            <p className="px-6 text-caption text-fg-muted">🌰 +1 · 🐛 −3 · 30초</p>
            <Button size="lg" onClick={start} loading={busy}>
              시작하기
            </Button>
          </div>
        )}
        {drops.map((d) => (
          <span key={d.id} className="absolute -translate-x-1/2 text-[26px] leading-none" style={{ left: `${d.x}%`, top: `${d.y}%` }} aria-hidden>
            {d.bad ? "🐛" : "🌰"}
          </span>
        ))}
        <span className="absolute bottom-[4%] -translate-x-1/2 text-center text-[40px] leading-none" style={{ left: `${basket}%`, width: `${BASKET_W}%` }} aria-hidden>
          🧺
        </span>
      </div>
    </div>
  );
}
