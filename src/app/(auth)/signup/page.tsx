import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "가입하기" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <>
      <h1 className="text-display font-bold">나만의 다락 만들기</h1>
      <p className="mt-2 mb-8 text-fg-muted">1분이면 충분해요. 미니미가 먼저 기다리고 있어요.</p>
      <SignupForm />
      <p className="mt-8 text-center text-caption text-fg-muted">
        이미 다락이 있나요?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          로그인
        </Link>
      </p>
    </>
  );
}
