"use client";

import { Share2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { IconButton, Button } from "@/components/ui/button";

/** 모바일은 시스템 공유 시트, 데스크톱은 링크 복사 */
export function ShareButton({ url, title, withLabel }: { url: string; title: string; withLabel?: boolean }) {
  const toast = useToast();
  async function share() {
    const full = new URL(url, location.origin).toString();
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url: full });
        return;
      }
      await navigator.clipboard.writeText(full);
      toast("링크를 복사했어요. 친구에게 보내보세요!");
    } catch {
      /* 사용자가 공유를 취소한 경우 */
    }
  }
  return withLabel ? (
    <Button variant="ghost" size="sm" onClick={share} icon={<Share2 className="size-4" />}>
      공간 공유
    </Button>
  ) : (
    <IconButton label="공간 공유하기" onClick={share}>
      <Share2 className="size-5" />
    </IconButton>
  );
}
