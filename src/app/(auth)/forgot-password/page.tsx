import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "비밀번호 찾기", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-display font-bold">비밀번호를 잊으셨나요?</h1>
      <p className="mt-2 mb-8 text-fg-muted">가입한 이메일로 재설정 링크를 보내 드릴게요.</p>
      <ForgotForm />
      <p className="mt-8 text-center text-caption text-fg-muted">
        생각났나요?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          로그인
        </Link>
      </p>
    </>
  );
}
