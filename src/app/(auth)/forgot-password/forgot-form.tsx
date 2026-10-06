"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/features/users/account-actions";
import { Input } from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/forms/submit-button";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-lg bg-success-soft px-5 py-6 text-center">
        <MailCheck className="size-8 text-success" />
        <p className="font-semibold">{state.message}</p>
        <p className="text-caption text-fg-muted">메일이 안 보이면 스팸함도 확인해 주세요. 링크는 1시간 동안 유효해요.</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Input name="email" type="email" label="이메일" autoComplete="email" required autoFocus error={state && !state.ok ? state.fieldErrors?.email : undefined} />
      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <SubmitButton size="lg" className="w-full" pendingText="보내는 중…">
        재설정 링크 받기
      </SubmitButton>
    </form>
  );
}
