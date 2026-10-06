import { listSuspendedUsers, recentModerationActions } from "@/features/admin/queries";
import { relativeTime } from "@/lib/dates";
import { SectionHeader } from "@/components/ui/misc";
import { SuspendForm, UnsuspendButton } from "@/components/admin/suspend-controls";
import { UserLink } from "@/components/user/user-link";

const actionLabel: Record<string, string> = {
  HIDE_CONTENT: "콘텐츠 숨김",
  SUSPEND_USER: "계정 정지",
  UNSUSPEND_USER: "정지 해제",
  HIDE_AND_SUSPEND: "숨김 + 정지",
  DISMISS: "신고 기각",
};

export default async function AdminUsersPage() {
  const [suspended, log] = await Promise.all([listSuspendedUsers(), recentModerationActions()]);
  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHeader title="계정 정지" description="아이디로 바로 정지하거나 해제할 수 있어요." />
        <SuspendForm />
      </section>
      <section>
        <SectionHeader title={`정지된 계정 ${suspended.length}`} />
        {suspended.length === 0 ? (
          <p className="space-card px-4 py-6 text-center text-caption text-fg-muted">정지된 계정이 없어요.</p>
        ) : (
          <ul className="space-card divide-y divide-line">
            {suspended.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <UserLink user={u} size="sm" />
                <UnsuspendButton username={u.username} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <SectionHeader title="최근 조치 기록" />
        <ul className="space-card divide-y divide-line text-caption">
          {log.length === 0 && <li className="px-4 py-6 text-center text-fg-muted">아직 기록이 없어요.</li>}
          {log.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
              <b>{actionLabel[a.action] ?? a.action}</b>
              <span className="text-fg-muted">
                {a.targetType} · {a.targetId.slice(0, 10)}…
              </span>
              {a.note && <span className="text-fg-muted">&ldquo;{a.note}&rdquo;</span>}
              <span className="ml-auto text-fg-subtle">
                @{a.admin} · {relativeTime(a.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
