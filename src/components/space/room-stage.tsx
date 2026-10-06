"use client";

import Link from "next/link";
import { Box } from "lucide-react";
import { PresenceOverlay, usePresence } from "@/components/space/presence";

/**
 * 2D 미니룸 무대. 함께 있는 사람을 방 바닥에 보여 주고, 2.5D 집으로 들어가는 문을 단다.
 */
export function RoomStage({ houseHref, presenceFor = null, children }: { houseHref?: string; presenceFor?: string | null; children: React.ReactNode }) {
  const { people } = usePresence(presenceFor);
  return (
    <div className="relative">
      {children}
      <PresenceOverlay people={people} />
      {houseHref && (
        <Link href={houseHref} className="absolute right-2 bottom-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/90 px-3 text-label font-bold text-fg shadow-2 backdrop-blur hover:bg-surface">
          <Box className="size-4" />
          2.5D 집 놀러가기
        </Link>
      )}
    </div>
  );
}
