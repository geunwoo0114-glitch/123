"use client";

import { useState } from "react";
import { memoryScore } from "@/features/town/games";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useGameSession } from "./use-game-session";
import { GameResult } from "./game-result";

const faces = ["🌰", "🍀", "🎧", "☕", "📷", "🌙", "🐱", "🌷"];

type Card = { id: number; face: string; open: boolean; matched: boolean };

function shuffled(): Card[] {
  const deck = [...faces, ...faces].map((face, id) => ({ id, face, open: false, matched: false }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function MemoryGame() {
  const { begin, end, result, busy } = useGameSession("memory");
  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lock, setLock] = useState(false);
  const [score, setScore] = useState(0);

  async function start() {
    if (await begin()) {
      setCards(shuffled());
      setMoves(0);
      setPlaying(true);
    }
  }

  function flip(i: number) {
    if (!playing || lock) return;
    const card = cards[i];
    if (card.open || card.matched) return;
    const next = cards.map((c, k) => (k === i ? { ...c, open: true } : c));
    const opened = next.filter((c) => c.open && !c.matched);
    setCards(next);
    if (opened.length === 2) {
      const totalMoves = moves + 1;
      setMoves(totalMoves);
      setLock(true);
      const [a, b] = opened;
      const resolved = next.map((c) => (c.id === a.id || c.id === b.id ? (a.face === b.face ? { ...c, matched: true, open: false } : { ...c, open: false }) : c));
      setTimeout(
        () => {
          setCards(resolved);
          setLock(false);
          if (resolved.every((c) => c.matched)) {
            setPlaying(false);
            const s = memoryScore(totalMoves);
            setScore(s);
            void end(s);
          }
        },
        a.face === b.face ? 250 : 700,
      );
    }
  }

  if (result) return <GameResult score={score} label={`${moves}번 만에 성공!`} reward={result.reward} message={result.message} onRetry={start} />;

  if (!playing) {
    return (
      <div className="space-card flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-[48px]" aria-hidden>
          🃏
        </p>
        <p className="text-caption text-fg-muted">8쌍을 모두 찾으면 끝! 8번 만에 찾으면 만점이에요.</p>
        <Button size="lg" onClick={start} loading={busy}>
          시작하기
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-center text-caption font-semibold tabular-nums" aria-live="polite">
        뒤집은 횟수 {moves}
      </p>
      <div className="grid grid-cols-4 gap-2" role="grid" aria-label="카드">
        {cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => flip(i)}
            aria-label={c.open || c.matched ? c.face : "뒤집힌 카드"}
            disabled={c.matched}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg text-[32px] shadow-1 transition-all duration-200 select-none",
              c.matched ? "scale-95 bg-success-soft opacity-60" : c.open ? "bg-surface" : "bg-primary hover:brightness-105 active:scale-95",
            )}
          >
            {c.open || c.matched ? c.face : <span className="text-[22px] text-on-primary/80">?</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
