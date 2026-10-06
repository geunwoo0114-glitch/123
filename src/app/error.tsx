"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

/** 페이지 단위 Error Boundary: 개발 오류를 그대로 노출하지 않고 재시도 UI를 보여준다 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[48px]" aria-hidden>
        🧹
      </p>
      <h1 className="text-heading font-bold">잠깐 문제가 생겼어요</h1>
      <p className="max-w-sm text-fg-muted">일시적인 문제일 수 있어요. 다시 시도해 주세요.{error.digest && <span className="mt-1 block text-label text-fg-subtle">오류 코드: {error.digest}</span>}</p>
      <div className="flex gap-2">
        <Button onClick={reset}>다시 시도</Button>
        <ButtonLink href="/" variant="secondary">
          홈으로
        </ButtonLink>
      </div>
    </main>
  );
}
