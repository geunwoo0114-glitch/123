"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeUsername } from "@/features/space/actions";
import { logoutAction } from "@/features/users/auth-actions";
import { appConfig } from "@/config/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function AccountSection({ username: initial }: { username: string }) {
  const [username, setUsername] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <section className="space-card flex flex-col gap-4 p-5" aria-label="계정">
      <h2 className="text-title font-bold">계정</h2>
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
      <form action={logoutAction} className="border-t border-line pt-4">
        <Button type="submit" variant="ghost" className="text-danger">
          로그아웃
        </Button>
      </form>
    </section>
  );
}
