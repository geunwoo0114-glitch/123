"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Box, Image as ImageIcon } from "lucide-react";
import type { RoomConfig } from "@/features/room/schema";
import { minimiUrl, type AvatarConfig } from "@/features/avatar/schema";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { PresenceOverlay, usePresence } from "@/components/space/presence";

// three.js 번들은 '3D로 보기'를 누를 때만 내려받는다
const Room3D = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[320/190] items-center justify-center bg-accent-soft">
      <Spinner className="size-7 text-accent" label="3D 방 불러오는 중" />
    </div>
  ),
});

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** 2D 미니룸 ↔ 3D 방 전환. 색은 현재 공간 테마(CSS 변수)를 읽어 3D에도 그대로 쓴다. */
export function RoomViewer({
  room,
  minimi,
  name,
  presenceFor = null,
  children,
}: {
  room: RoomConfig;
  minimi: AvatarConfig | null;
  name: string;
  /** 로그인한 방문자일 때 공간 주인의 username — 함께 있는 사람을 방에 보여준다 */
  presenceFor?: string | null;
  children: React.ReactNode;
}) {
  const people = usePresence(presenceFor);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [colors, setColors] = useState({ accent: "#BD3916", soft: "#FDEBE3" });
  const [unsupported, setUnsupported] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  function open3d() {
    if (!webglAvailable()) {
      setUnsupported(true);
      return;
    }
    const style = root.current ? getComputedStyle(root.current) : null;
    const accent = style?.getPropertyValue("--space-accent").trim();
    const soft = style?.getPropertyValue("--space-soft-current").trim();
    setColors({ accent: accent && accent.startsWith("#") ? accent : colors.accent, soft: soft && soft.startsWith("#") ? soft : colors.soft });
    setMode("3d");
  }

  return (
    <div ref={root} className="relative">
      {mode === "2d" ? (
        children
      ) : (
        <div className="aspect-[320/190] w-full touch-none overflow-hidden rounded-lg">
          <Room3D room={room} colors={colors} minimiUrl={minimi ? minimiUrl(minimi) : null} label={`${name}의 3D 방. 드래그해서 둘러볼 수 있어요.`} />
        </div>
      )}
      <PresenceOverlay people={people} />
      <button
        type="button"
        onClick={() => (mode === "2d" ? open3d() : setMode("2d"))}
        aria-pressed={mode === "3d"}
        className={cn("absolute right-2 bottom-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/90 px-3 text-label font-bold text-fg shadow-2 backdrop-blur hover:bg-surface")}
      >
        {mode === "2d" ? <Box className="size-4" /> : <ImageIcon className="size-4" />}
        {mode === "2d" ? "3D로 보기" : "2D로 보기"}
      </button>
      {unsupported && <p className="absolute top-2 left-2 rounded-md bg-surface px-2 py-1 text-label text-fg-muted shadow-1">이 기기에서는 3D를 볼 수 없어요.</p>}
    </div>
  );
}
