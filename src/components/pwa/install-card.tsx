"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X, SquarePlus } from "lucide-react";
import { brand } from "@/config/brand";
import { josa } from "@/lib/josa";
import { Button } from "@/components/ui/button";
import { isIOS, isStandalone } from "./push";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "darak:install-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * 홈 화면에 앱으로 설치하기 안내.
 * - 안드로이드/크롬: 브라우저 설치 창을 띄운다
 * - iOS 사파리: 공유 → 홈 화면에 추가 방법을 알려준다 (iOS는 설치해야 푸시를 받을 수 있음)
 * 한 번 닫으면 다시 보이지 않는다.
 */
export function InstallCard() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!mounted || dismissed || readDismissed() || isStandalone()) return null;
  const ios = isIOS();
  if (!deferred && !ios) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* 저장 실패해도 이번 화면에서는 닫는다 */
    }
    setDismissed(true);
  }

  return (
    <section aria-label="앱으로 설치하기" className="space-card relative mt-4 flex items-start gap-3 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Download className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{josa(brand.name, "을", "를")} 앱처럼 쓰기</p>
        {ios ? (
          <p className="mt-0.5 text-caption text-fg-muted">
            사파리 아래쪽 <Share className="inline size-4 align-text-bottom" aria-label="공유" /> 버튼 → <b>홈 화면에 추가</b>
            <SquarePlus className="ml-0.5 inline size-4 align-text-bottom" aria-hidden />를 누르면 설치돼요. 설치하면 친구 소식 알림도 받을 수 있어요.
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-caption text-fg-muted">홈 화면에서 바로 열고, 방명록·쪽지 알림을 받아보세요.</p>
            <Button
              size="sm"
              className="mt-2"
              onClick={async () => {
                await deferred?.prompt();
                const choice = await deferred?.userChoice;
                if (choice?.outcome === "accepted") dismiss();
                setDeferred(null);
              }}
            >
              설치하기
            </Button>
          </>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="설치 안내 닫기" className="-mt-1 -mr-1 rounded-full p-1.5 text-fg-subtle hover:bg-surface-muted">
        <X className="size-4" />
      </button>
    </section>
  );
}
