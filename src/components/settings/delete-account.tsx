"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/features/users/account-actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <section className="space-card border border-danger/30 p-5" aria-label="회원 탈퇴">
      <h2 className="text-title font-bold text-danger">회원 탈퇴</h2>
      <p className="mt-1 text-caption text-fg-muted">내 공간, 소식, 다이어리, 사진, 방명록, 쪽지, 친구 관계, 미니미 아이템이 모두 지워지고 되돌릴 수 없어요.</p>
      <Button variant="ghost" className="mt-3 text-danger" onClick={() => setOpen(true)}>
        탈퇴하기
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="정말 탈퇴할까요?"
        description="모든 기록이 바로 삭제돼요. 다시 가입해도 복구할 수 없어요."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              loading={pending}
              disabled={!password || confirm !== "탈퇴"}
              onClick={() =>
                start(async () => {
                  setErrors({});
                  const res = await deleteAccount({ password, confirm });
                  if (res.ok) {
                    toast(res.message ?? "탈퇴했어요.");
                    router.replace("/");
                    router.refresh();
                  } else {
                    setErrors(res.fieldErrors ?? {});
                    toast(res.error, "error");
                  }
                })
              }
            >
              영구 삭제
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input type="password" label="비밀번호" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <Input label="확인을 위해 '탈퇴'라고 입력해 주세요" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        </div>
      </Dialog>
    </section>
  );
}
