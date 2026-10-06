"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtime } from "./use-realtime";

/** 새 알림/쪽지가 오면 화면의 배지(알림·쪽지 수)를 새로 그린다 (짧은 시간 내 여러 건은 한 번만) */
export function RealtimeRefresher() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useRealtime((e) => {
    // 집 안 움직임은 화면을 새로 그릴 일이 아니다
    if (e.type === "presence") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), 400);
  });
  return null;
}
