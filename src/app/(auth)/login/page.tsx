import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/guards";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = safeNext(next);
  if (await getCurrentUser()) redirect(nextPath);
  return (
    <>
      <h1 className="text-display font-bold">다시 만나서 반가워요</h1>
      <p className="mt-2 mb-8 text-fg-muted">내 다락에 불을 켜 볼까요?</p>
      <LoginForm next={nextPath} />
      <p className="mt-8 text-center text-caption text-fg-muted">
        아직 다락이 없나요?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          가입하기
        </Link>
      </p>
    </>
  );
}
