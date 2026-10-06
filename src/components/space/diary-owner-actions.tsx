"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDiary } from "@/features/diary/actions";
import { ButtonLink, Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

export function DiaryOwnerActions({ id, username }: { id: string; username: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="mt-8 flex justify-end gap-2 border-t border-line pt-4">
      <ButtonLink href={`/write/diary?id=${id}`} variant="secondary" size="sm">
        수정
      </ButtonLink>
      <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirm(true)}>
        삭제
      </Button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="이 일기를 삭제할까요?"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await deleteDiary(id);
            toast(res.ok ? (res.message ?? "삭제했어요.") : res.error, res.ok ? "success" : "error");
            if (res.ok) router.push(`/@${username}/diary`);
          })
        }
      />
    </div>
  );
}
