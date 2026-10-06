import Link from "next/link";
import { peekAuthToken } from "@/lib/auth/tokens";
import { ResetForm } from "./reset-form";

export const metadata = { title: "새 비밀번호", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && (await peekAuthToken(token, "PASSWORD_RESET"));
  return (
    <>
      <h1 className="text-display font-bold">새 비밀번호 정하기</h1>
      {valid ? (
        <>
          <p className="mt-2 mb-8 text-fg-muted">바꾸면 모든 기기에서 로그아웃돼요.</p>
          <ResetForm token={token as string} />
        </>
      ) : (
        <div className="mt-6 rounded-lg bg-warning-soft px-5 py-5">
          <p className="font-semibold">링크가 만료되었거나 이미 사용되었어요.</p>
          <Link href="/forgot-password" className="mt-2 inline-block font-semibold text-primary hover:underline">
            재설정 링크 다시 받기
          </Link>
        </div>
      )}
    </>
  );
}
