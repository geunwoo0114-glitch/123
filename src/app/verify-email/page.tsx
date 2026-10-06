import { LogoMark } from "@/components/brand/logo";
import { VerifyButton } from "./verify-button";

export const metadata = { title: "이메일 인증", robots: { index: false } };

/**
 * 메일 링크로 들어오는 화면. 메일 보안 스캐너가 링크를 미리 열어도 인증이 소모되지 않도록
 * GET으로는 아무것도 바꾸지 않고, 버튼을 눌러야 인증한다.
 */
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="size-14" />
      <h1 className="text-heading font-bold">이메일 주소 확인</h1>
      {typeof token === "string" ? (
        <>
          <p className="max-w-sm text-fg-muted">아래 버튼을 누르면 인증이 끝나요.</p>
          <VerifyButton token={token} />
        </>
      ) : (
        <p className="text-fg-muted">인증 링크가 올바르지 않아요.</p>
      )}
    </main>
  );
}
