"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { RealtimeEvent } from "@/lib/realtime/hub";

/**
 * 탭당 하나의 EventSource(/api/events)를 공유한다.
 * 브라우저가 끊기면 자동 재연결(retry: 5초)하고, 그동안은 각 화면의 폴링이 대신한다.
 */
type Handler = (e: RealtimeEvent) => void;

const handlers = new Set<Handler>();
const statusListeners = new Set<() => void>();
let source: EventSource | null = null;
let connected = false;
let users = 0;

function setConnected(v: boolean) {
  connected = v;
  statusListeners.forEach((fn) => fn());
}

function open() {
  if (source || typeof window === "undefined" || !("EventSource" in window)) return;
  source = new EventSource("/api/events");
  source.onopen = () => setConnected(true);
  source.onerror = () => setConnected(false);
  for (const type of ["dm", "notification"] as const) {
    source.addEventListener(type, (msg) => {
      try {
        const event = JSON.parse((msg as MessageEvent<string>).data) as RealtimeEvent;
        handlers.forEach((h) => h(event));
      } catch {
        /* 잘못된 이벤트 무시 */
      }
    });
  }
}

function close() {
  source?.close();
  source = null;
  setConnected(false);
}

export function useRealtime(handler: Handler) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  }, [handler]);
  useEffect(() => {
    const h: Handler = (e) => ref.current(e);
    handlers.add(h);
    users++;
    open();
    return () => {
      handlers.delete(h);
      users--;
      if (users === 0) close();
    };
  }, []);
}

/** 실시간 연결 여부 (연결되어 있으면 폴링 간격을 늘린다) */
export function useRealtimeConnected() {
  return useSyncExternalStore(
    (fn) => {
      statusListeners.add(fn);
      return () => statusListeners.delete(fn);
    },
    () => connected,
    () => false,
  );
}
