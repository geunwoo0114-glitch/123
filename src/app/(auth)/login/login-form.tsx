"use client";

import { useActionState } from "react";
import { loginAction } from "@/features/users/auth-actions";
import { Input } from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/forms/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? "/"} />
      <Input name="identifier" label="이메일 또는 아이디" autoComplete="username" autoCapitalize="none" required error={fe?.identifier} autoFocus />
      <Input name="password" type="password" label="비밀번호" autoComplete="current-password" required error={fe?.password} />
      <FormError message={state && !state.ok && !fe?.identifier && !fe?.password ? state.error : null} />
      <SubmitButton size="lg" className="mt-2 w-full" pendingText="들어가는 중…">
        로그인
      </SubmitButton>
    </form>
  );
}
