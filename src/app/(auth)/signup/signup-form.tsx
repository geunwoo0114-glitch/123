"use client";

import { useActionState, useState } from "react";
import { signupAction } from "@/features/users/auth-actions";
import { Input } from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/forms/submit-button";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, null);
  const [username, setUsername] = useState("");
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Input name="email" type="email" label="이메일" autoComplete="email" required error={fe?.email} autoFocus />
      <Input
        name="username"
        label="아이디"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        prefix="@"
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
        hint={username ? `내 다락 주소: darak.app/@${username}` : "영문 소문자, 숫자, _, . (3~20자)"}
        error={fe?.username}
        maxLength={20}
        required
      />
      <Input name="displayName" label="이름(닉네임)" autoComplete="nickname" maxLength={24} required error={fe?.displayName} hint="친구들에게 보이는 이름이에요." />
      <Input name="password" type="password" label="비밀번호" autoComplete="new-password" required error={fe?.password} hint="영문과 숫자를 섞어 8자 이상" />
      <FormError message={state && !state.ok && !fe ? state.error : null} />
      <SubmitButton size="lg" className="mt-2 w-full" pendingText="다락 짓는 중…">
        내 다락 만들기
      </SubmitButton>
      <p className="text-center text-label text-fg-subtle">
        가입하면{" "}
        <a href="/terms" target="_blank" className="underline">
          이용약관
        </a>
        과{" "}
        <a href="/privacy" target="_blank" className="font-semibold underline">
          개인정보처리방침
        </a>
        에 동의하는 것으로 봐요. 만 14세 이상만 가입할 수 있어요.
      </p>
    </form>
  );
}
