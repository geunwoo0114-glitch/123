"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeUsername } from "@/features/space/actions";
import { logoutAction } from "@/features/users/auth-actions";
import { changePassword, resendVerification } from "@/features/users/account-actions";
import { Badge } from "@/components/ui/misc";
import { appConfig } from "@/config/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function AccountSection({ username: initial, email, verified }: { username: string; email: string; verified: boolean }) {
  const [username, setUsername] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <section className="space-card flex flex-col gap-4 p-5" aria-label="계정">
      <h2 className="text-title font-bold">계정</h2>
      <div className="flex flex-wrap items-center gap-2 text-body">
        <span className="text-fg-muted">이메일</span>
        <b>{email}</b>
        {verified ? <Badge tone="success">인증됨</Badge> : <Badge tone="warning">미인증</Badge>}
        {!verified && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              start(async () => {
                const res = await resendVerification();
                toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
              })
            }
          >
            인증 메일 받기
          </Button>
        )}
      </div>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          start(async () => {
            const res = await changeUsername({ username });
            if (res.ok) {
              toast(res.message ?? "바꿨어요.");
              router.refresh();
            } else {
              setError(res.fieldErrors?.username ?? res.error);
            }
          });
        }}
      >
        <Input
          label="아이디 (공간 주소)"
          prefix="@"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
          maxLength={appConfig.username.max}
          hint={`바꾸면 예전 주소는 더 이상 동작하지 않아요. ${appConfig.username.changeCooldownDays}일에 한 번 변경 가능.`}
          error={error}
          wrapClassName="flex-1"
        />
        <Button type="submit" variant="secondary" className="sm:mt-7" loading={pending} disabled={username === initial}>
          변경
        </Button>
      </form>
      <PasswordForm />
      <form action={logoutAction} className="border-t border-line pt-4">
        <Button type="submit" variant="ghost" className="text-danger">
          로그아웃
        </Button>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <form
      className="flex flex-col gap-3 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors({});
        start(async () => {
          const res = await changePassword({ current, next });
          if (res.ok) {
            setCurrent("");
            setNext("");
            toast(res.message ?? "바꿨어요.");
          } else {
            setErrors(res.fieldErrors ?? {});
            toast(res.error, "error");
          }
        });
      }}
    >
      <h3 className="font-semibold">비밀번호 바꾸기</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input type="password" label="현재 비밀번호" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
        <Input type="password" label="새 비밀번호" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} hint="영문과 숫자를 섞어 8자 이상" />
      </div>
      <Button type="submit" variant="secondary" className="w-fit" loading={pending} disabled={!current || !next}>
        비밀번호 바꾸기
      </Button>
    </form>
  );
}
