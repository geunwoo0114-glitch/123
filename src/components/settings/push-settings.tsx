"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { sendTestPush, setQuietHours, subscribePush, unsubscribePush } from "@/features/push/actions";
import { Switch } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { isIOS, isStandalone, pushSupported, registerServiceWorker, urlBase64ToUint8Array } from "@/components/pwa/push";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

/** 이 기기에서 푸시 알림 받기 (켜고 끄기 + 밤에는 조용히 + 테스트) */
export function PushSettings({ quietHours, publicKey }: { quietHours: boolean; publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [quiet, setQuiet] = useState(quietHours);
  const [pending, start] = useTransition();
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      let next: State;
      if (!pushSupported(publicKey)) next = isIOS() && !isStandalone() ? "ios-install" : "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await registerServiceWorker();
        const sub = await reg?.pushManager.getSubscription();
        next = sub ? "on" : "off";
      }
      if (alive) setState(next);
    })().catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, [publicKey]);

  function toggle(on: boolean) {
    start(async () => {
      try {
        const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
        if (on) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setState(permission === "denied" ? "denied" : "off");
            return;
          }
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
          const res = await subscribePush(JSON.parse(JSON.stringify(sub)));
          toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
          if (res.ok) setState("on");
        } else {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await unsubscribePush(sub.endpoint);
            await sub.unsubscribe();
          }
          setState("off");
          toast("이 기기의 알림을 껐어요.");
        }
      } catch {
        toast("알림 설정을 바꾸지 못했어요. 브라우저 설정을 확인해 주세요.", "error");
      }
    });
  }

  return (
    <section className="space-card divide-y divide-line px-5 py-2" aria-label="기기 알림">
      <h2 className="flex items-center gap-2 py-3 text-title font-bold">
        <BellRing className="size-5" /> 이 기기에서 알림 받기
      </h2>
      {state === "loading" && <p className="py-3 text-caption text-fg-muted">확인하는 중…</p>}
      {state === "unsupported" && <p className="py-3 text-caption text-fg-muted">이 브라우저에서는 푸시 알림을 쓸 수 없어요.</p>}
      {state === "ios-install" && <p className="py-3 text-caption text-fg-muted">아이폰은 다락을 <b>홈 화면에 추가</b>한 뒤 앱에서 알림을 켤 수 있어요. (사파리 공유 버튼 → 홈 화면에 추가)</p>}
      {state === "denied" && <p className="py-3 text-caption text-fg-muted">브라우저에서 알림이 차단되어 있어요. 브라우저 사이트 설정에서 알림을 허용해 주세요.</p>}
      {(state === "on" || state === "off") && (
        <>
          <Switch checked={state === "on"} onChange={toggle} disabled={pending} label="푸시 알림" description="방명록, 쪽지, 친구 신청, 댓글 등을 휴대폰/PC 알림으로 받아요." />
          <Switch
            checked={quiet}
            onChange={(v) => {
              setQuiet(v);
              start(async () => {
                const res = await setQuietHours(v);
                toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
              });
            }}
            label="밤에는 조용히"
            description="밤 11시~아침 8시에는 알림을 보내지 않아요. (알림 목록에는 남아요)"
          />
          {state === "on" && (
            <div className="py-3">
              <Button
                size="sm"
                variant="secondary"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const res = await sendTestPush();
                    toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
                  })
                }
              >
                테스트 알림 보내기
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
