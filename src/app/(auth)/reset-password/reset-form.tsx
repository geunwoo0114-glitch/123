"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/features/users/account-actions";
import { Input } from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/forms/submit-button";
import { ButtonLink } from "@/components/ui/button";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, null);
  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-lg bg-success-soft px-5 py-6 text-center">
        <p className="font-semibold">{state.message}</p>
        <ButtonLink href="/login">로그인하기</ButtonLink>
      </div>
    );
  }
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Input name="password" type="password" label="새 비밀번호" autoComplete="new-password" hint="영문과 숫자를 섞어 8자 이상" required autoFocus error={fe?.password} />
      <FormError message={state && !state.ok && !fe?.password ? state.error : null} />
      <SubmitButton size="lg" className="w-full" pendingText="바꾸는 중…">
        비밀번호 바꾸기
      </SubmitButton>
      {state && !state.ok && !fe && (
        <Link href="/forgot-password" className="text-center text-caption font-semibold text-primary">
          재설정 링크 다시 받기
        </Link>
      )}
    </form>
  );
}
