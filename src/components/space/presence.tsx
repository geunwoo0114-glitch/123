"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtime } from "@/components/realtime/use-realtime";
import type { PresentVisitor } from "@/features/presence/service";
import { minimiUrl } from "@/features/avatar/schema";
import { Avatar } from "@/components/ui/avatar";

const HEARTBEAT_MS = 15_000;
/** 걷기 위치는 이 간격으로 묶어서 보낸다 */
const MOVE_THROTTLE_MS = 300;

/**
 * 공간에 머무는 동안 15초마다 '여기 있어요' 신호를 보내고 함께 있는 사람을 받아온다.
 * 같은 공간 사람의 들어옴/움직임/나감은 실시간 이벤트(SSE)로 바로 반영한다.
 * 탭이 가려지면 멈추고, 페이지를 떠나면 바로 나갔다고 알린다.
 */
export function usePresence(username: string | null) {
  const [people, setPeople] = useState<PresentVisitor[]>([]);
  const hostId = useRef<string | null>(null);
  const beatNow = useRef<() => void>(() => {});
  const moveState = useRef<{ timer: ReturnType<typeof setTimeout> | null; pending: { x: number; z: number } | null; last: string }>({ timer: null, pending: null, last: "" });

  useEffect(() => {
    if (!username) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const body = (leave = false) => JSON.stringify(leave ? { username, leave } : { username });

    async function beat() {
      if (stopped) return;
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/presence", { method: "POST", body: body(), headers: { "Content-Type": "application/json" }, cache: "no-store" });
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            stopped = true;
            return;
          }
          if (res.ok) {
            const data = (await res.json()) as { hostId: string; people: PresentVisitor[] };
            hostId.current = data.hostId;
            if (!stopped) setPeople(data.people);
          }
        } catch {
          /* 네트워크가 잠시 끊겨도 다음 신호에서 다시 시도 */
        }
      }
      if (!stopped) timer = setTimeout(beat, HEARTBEAT_MS);
    }
    beatNow.current = () => void beat();

    const leave = () => navigator.sendBeacon?.("/api/presence", body(true));
    const onVisible = () => {
      if (document.visibilityState === "visible" && !stopped) void beat();
    };
    void beat();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", leave);
    const move = moveState.current;
    return () => {
      stopped = true;
      clearTimeout(timer);
      if (move.timer) clearTimeout(move.timer);
      move.timer = null;
      move.pending = null;
      move.last = "";
      beatNow.current = () => {};
      hostId.current = null;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", leave);
      // 같은 앱 안에서 다른 페이지로 이동할 때도 나갔다고 알린다
      leave();
      setPeople([]);
    };
  }, [username]);

  useRealtime((e) => {
    if (e.type !== "presence" || !hostId.current || e.hostId !== hostId.current) return;
    if (e.kind === "leave") return setPeople((ps) => ps.filter((p) => p.id !== e.id));
    if (e.kind === "join") return beatNow.current();
    setPeople((ps) => {
      if (!ps.some((p) => p.id === e.id)) {
        beatNow.current();
        return ps;
      }
      return ps.map((p) => (p.id === e.id ? { ...p, x: e.x ?? null, z: e.z ?? null } : p));
    });
  }, !!username);

  /** 내 자리 옮기기 (0.3초 간격으로 마지막 위치만 보낸다) */
  const move = useCallback(
    (x: number, z: number) => {
      if (!username) return;
      const m = moveState.current;
      m.pending = { x, z };
      if (m.timer) return;
      const send = () => {
        const next = m.pending;
        m.pending = null;
        // 같은 자리를 다시 보내지 않는다
        if (!next || `${next.x},${next.z}` === m.last) {
          m.timer = null;
          return;
        }
        m.last = `${next.x},${next.z}`;
        void fetch("/api/presence", { method: "POST", body: JSON.stringify({ username, ...next }), headers: { "Content-Type": "application/json" }, cache: "no-store" }).catch(() => undefined);
        m.timer = setTimeout(send, MOVE_THROTTLE_MS);
      };
      send();
    },
    [username],
  );

  return { people, move };
}

/** 방 바닥에 서 있는 '지금 함께 있는 사람들' */
export function PresenceOverlay({ people }: { people: PresentVisitor[] }) {
  const shown = people.slice(0, 4);
  const rest = people.length - shown.length;
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 flex max-w-[70%] flex-col items-start gap-1" aria-live="polite">
      {people.length > 0 && (
        <>
          <ul className="pointer-events-auto flex items-end gap-1" aria-label="지금 함께 있는 사람">
            {shown.map((p) => (
              <li key={p.id}>
                <Link href={`/@${p.username}`} title={`${p.displayName}${p.isHost ? " (주인)" : ""}`} className="group flex flex-col items-center">
                  {p.minimi ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 서버가 그리는 SVG 미니미
                    <img src={minimiUrl(p.minimi)} alt="" className="size-11 drop-shadow transition-transform group-hover:-translate-y-0.5 sm:size-14" />
                  ) : (
                    <Avatar name={p.displayName} avatarKey={p.avatarKey} size="md" ring />
                  )}
                  <span className="-mt-1 max-w-16 truncate rounded-full bg-surface/90 px-1.5 text-[11px] font-semibold text-fg shadow-1">
                    {p.isHost ? "🏠 " : ""}
                    {p.displayName}
                  </span>
                </Link>
              </li>
            ))}
            {rest > 0 && <li className="self-center rounded-full bg-surface/90 px-2 py-0.5 text-label font-semibold text-fg-muted shadow-1">+{rest}</li>}
          </ul>
          <p className="flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-0.5 text-label font-bold text-fg shadow-1">
            <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden />
            지금 {people.length}명이 함께 있어요
          </p>
        </>
      )}
    </div>
  );
}
