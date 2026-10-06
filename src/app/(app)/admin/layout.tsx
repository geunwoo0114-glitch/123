import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { MobileTopBar } from "@/components/shell/nav";

export const metadata = { title: "운영", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <MobileTopBar title="운영" />
      <div className="mx-auto max-w-4xl px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-1 hidden text-display font-bold lg:block">운영</h1>
        <p className="mb-4 text-caption text-fg-muted">신고를 확인하고 조치해요. 모든 조치는 기록에 남아요.</p>
        <nav aria-label="운영 메뉴" className="mb-5 flex gap-2">
          <Link href="/admin" className="h-9 rounded-full bg-surface px-4 leading-9 font-semibold shadow-1">신고 처리</Link>
          <Link href="/admin/users" className="h-9 rounded-full bg-surface px-4 leading-9 font-semibold shadow-1">사용자 정지 · 기록</Link>
        </nav>
        {children}
      </div>
    </>
  );
}
