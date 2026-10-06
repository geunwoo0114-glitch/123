"use client";

import { useState, useTransition } from "react";
import { MailWarning, X } from "lucide-react";
import { resendVerification } from "@/features/users/account-actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** 이메일 미인증 안내 (가입은 막지 않고, 비밀번호 찾기에 필요하다는 이유를 알려준다) */
export function VerifyBanner({ email }: { email: string }) {
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  if (hidden) return null;
  return (
    <section aria-label="이메일 인증 안내" className="mt-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4">
      <MailWarning className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">이메일 인증이 아직이에요</p>
        <p className="text-caption text-fg-muted">
          <b>{email}</b>로 보낸 메일의 링크를 눌러 주세요. 인증해 두면 비밀번호를 잊어도 찾을 수 있어요.
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await resendVerification();
              toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
            })
          }
        >
          인증 메일 다시 받기
        </Button>
      </div>
      <button type="button" onClick={() => setHidden(true)} aria-label="안내 닫기" className="-mt-1 -mr-1 rounded-full p-1.5 text-fg-subtle hover:bg-surface">
        <X className="size-4" />
      </button>
    </section>
  );
}
