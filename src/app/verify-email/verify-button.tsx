"use client";

import { useState, useTransition } from "react";
import { verifyEmail } from "@/features/users/account-actions";
import { Button, ButtonLink } from "@/components/ui/button";

export function VerifyButton({ token }: { token: string }) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  if (result) {
    return (
      <div role="status" className="flex flex-col items-center gap-3">
        <p className={result.ok ? "font-semibold text-success" : "font-semibold text-danger"}>{result.text}</p>
        <ButtonLink href="/">홈으로</ButtonLink>
      </div>
    );
  }
  return (
    <Button
      size="lg"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await verifyEmail(token);
          setResult({ ok: res.ok, text: res.ok ? (res.message ?? "인증했어요.") : res.error });
        })
      }
    >
      이메일 인증하기
    </Button>
  );
}
