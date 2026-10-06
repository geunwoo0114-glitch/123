"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishGame, startGame } from "@/features/town/actions";
import { useToast } from "@/components/ui/toast";
import type { GameId } from "@/features/town/games";

/** 서버 게임 세션 시작/종료를 감싼 훅 */
export function useGameSession(game: GameId) {
  const session = useRef<string | null>(null);
  const [result, setResult] = useState<{ reward: number; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const begin = useCallback(async () => {
    setResult(null);
    setBusy(true);
    const res = await startGame(game);
    setBusy(false);
    if (!res.ok || !res.data) {
      toast(res.ok ? "게임을 시작할 수 없어요." : res.error, "error");
      return false;
    }
    session.current = res.data.sessionId;
    return true;
  }, [game, toast]);

  const end = useCallback(
    async (score: number) => {
      if (!session.current) return;
      const id = session.current;
      session.current = null;
      setBusy(true);
      const res = await finishGame({ sessionId: id, score });
      setBusy(false);
      if (res.ok) {
        setResult({ reward: res.data?.reward ?? 0, message: res.message ?? "" });
        router.refresh();
      } else toast(res.error, "error");
    },
    [router, toast],
  );

  return { begin, end, result, busy };
}
