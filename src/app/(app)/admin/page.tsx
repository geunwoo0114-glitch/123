import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { listReportGroups } from "@/features/admin/queries";
import { EmptyState } from "@/components/ui/misc";
import { ReportCard } from "@/components/admin/report-card";
import { cn } from "@/lib/cn";

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin">) {
  const { tab } = await searchParams;
  const open = tab !== "closed";
  const groups = await listReportGroups(open);
  return (
    <div>
      <div className="mb-4 flex gap-4 text-caption font-semibold">
        <Link href="/admin" className={cn(open ? "text-fg underline underline-offset-4" : "text-fg-subtle")}>
          처리 대기
        </Link>
        <Link href="/admin?tab=closed" className={cn(!open ? "text-fg underline underline-offset-4" : "text-fg-subtle")}>
          처리 완료
        </Link>
      </div>
      {groups.length === 0 ? (
        <div className="space-card">
          <EmptyState icon={<ShieldCheck />} title={open ? "처리할 신고가 없어요" : "처리한 신고가 없어요"} />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <li key={`${g.targetType}:${g.targetId}`}>
              <ReportCard group={g} actionable={open} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
