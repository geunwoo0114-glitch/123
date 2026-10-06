"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReportGroup } from "@/features/admin/queries";
import { resolveReport } from "@/features/admin/actions";
import { relativeTime } from "@/lib/dates";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

const typeLabel: Record<string, string> = { USER: "사용자", POST: "게시물", COMMENT: "댓글", GUESTBOOK: "방명록", DIARY: "다이어리", PHOTO: "사진" };
type Action = "hide" | "suspend" | "hide_and_suspend" | "dismiss";
const actionText: Record<Action, string> = {
  hide: "콘텐츠 숨기기",
  suspend: "작성자 계정 정지",
  hide_and_suspend: "숨기고 계정 정지",
  dismiss: "기각 (문제 없음)",
};

export function ReportCard({ group, actionable }: { group: ReportGroup; actionable: boolean }) {
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const { preview } = group;
  const isUser = group.targetType === "USER";

  return (
    <article className="space-card p-4" aria-label={`${typeLabel[group.targetType]} 신고`}>
      <header className="flex flex-wrap items-center gap-2">
        <Badge tone="danger">{typeLabel[group.targetType]}</Badge>
        <Badge tone={group.count >= 3 ? "danger" : "warning"}>신고 {group.count}건</Badge>
        {preview.removed && <Badge>이미 숨김/정지됨</Badge>}
        <span className="ml-auto text-label text-fg-subtle">{relativeTime(group.latestAt)}</span>
      </header>
      <div className="mt-3 flex gap-3">
        {preview.thumbKey && (
          // eslint-disable-next-line @next/next/no-img-element -- 신고된 사진 썸네일
          <img src={`/media/${preview.thumbKey}`} alt="신고된 사진" className="size-20 shrink-0 rounded-md object-cover" />
        )}
        <div className="min-w-0 flex-1">
          {preview.owner && (
            <p className="mb-1 flex items-center gap-2 text-caption">
              <Avatar name={preview.owner.displayName} avatarKey={preview.owner.avatarKey} minimi={preview.owner.minimi} size="xs" />
              <b>{preview.owner.displayName}</b> <span className="text-fg-subtle">@{preview.owner.username}</span>
            </p>
          )}
          <p className="line-clamp-4 rounded-md bg-surface-muted px-3 py-2 text-body whitespace-pre-wrap">{preview.text}</p>
          {preview.href && (
            <Link href={preview.href} target="_blank" className="mt-1 inline-block text-label text-fg-muted underline">
              원본 보기
            </Link>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {group.reasons.map((r) => (
          <Badge key={r.label}>
            {r.label} {r.n}
          </Badge>
        ))}
      </div>
      {group.details.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-caption text-fg-muted">
          {group.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
      {actionable && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
          {!isUser && (
            <Button size="sm" variant="danger" onClick={() => setConfirm("hide")}>
              {actionText.hide}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setConfirm(isUser ? "suspend" : "hide_and_suspend")}>
            {isUser ? "계정 정지" : actionText.hide_and_suspend}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm("dismiss")}>
            {actionText.dismiss}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm ? `${actionText[confirm]}할까요?` : ""}
        description="이 대상에 대한 대기 중인 신고가 모두 처리돼요. 조치는 기록에 남아요."
        confirmLabel="확인"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await resolveReport({ targetType: group.targetType, targetId: group.targetId, action: confirm!, note });
            setConfirm(null);
            setNote("");
            toast(res.ok ? (res.message ?? "처리했어요.") : res.error, res.ok ? "success" : "error");
            router.refresh();
          })
        }
      />
    </article>
  );
}
