"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownRight } from "lucide-react";
import type { CommentDTO } from "@/features/posts/queries";
import { addComment, deleteComment } from "@/features/posts/actions";
import { appConfig } from "@/config/app";
import { relativeTime } from "@/lib/dates";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { ReportDialog } from "./report-dialog";

function CommentItem({ c, viewerId, onReply }: { c: CommentDTO; viewerId: string | null; onReply: (c: CommentDTO) => void }) {
  const [report, setReport] = useState(false);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (c.deleted) return <p className="py-2 text-caption text-fg-subtle">삭제된 댓글이에요.</p>;
  const items: MenuItem[] = [];
  if (viewerId) items.push({ label: "답글", onSelect: () => onReply(c) });
  if (c.canDelete)
    items.push({
      label: "삭제",
      danger: true,
      onSelect: () =>
        start(async () => {
          const res = await deleteComment(c.id);
          toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
          router.refresh();
        }),
    });
  if (viewerId && viewerId !== c.author.id) items.push({ label: "신고", danger: true, onSelect: () => setReport(true) });
  return (
    <div className="flex gap-2.5 py-2.5">
      <Link href={`/@${c.author.username}`} className="shrink-0">
        <Avatar name={c.author.displayName} avatarKey={c.author.avatarKey} minimi={c.author.minimi} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-caption">
          <Link href={`/@${c.author.username}`} className="font-semibold hover:underline">
            {c.author.displayName}
          </Link>{" "}
          <span className="text-fg-subtle">{relativeTime(c.createdAt)}</span>
        </p>
        <p className="text-body whitespace-pre-wrap">{c.body}</p>
      </div>
      <Menu items={items} />
      {report && <ReportDialog open onClose={() => setReport(false)} targetType="COMMENT" targetId={c.id} />}
    </div>
  );
}

export function CommentSection({ postId, comments, viewerId }: { postId: string; comments: CommentDTO[]; viewerId: string | null }) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommentDTO | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const roots = comments.filter((c) => !c.parentId);
  const replies = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <section id="comments" aria-label="댓글" className="space-card mt-4 p-4">
      <h2 className="mb-2 text-title font-bold">댓글 {comments.filter((c) => !c.deleted).length}</h2>
      {roots.length === 0 && <p className="py-6 text-center text-caption text-fg-muted">첫 댓글을 남겨 보세요.</p>}
      <div className="divide-y divide-line">
        {roots.map((c) => (
          <div key={c.id}>
            <CommentItem c={c} viewerId={viewerId} onReply={setReplyTo} />
            {replies(c.id).map((r) => (
              <div key={r.id} className="flex gap-1 pl-6">
                <CornerDownRight className="mt-4 size-4 shrink-0 text-fg-subtle" />
                <div className="min-w-0 flex-1">
                  <CommentItem c={r} viewerId={viewerId} onReply={() => setReplyTo(c)} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {viewerId ? (
        <form
          className="mt-3 flex flex-col gap-2 border-t border-line pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await addComment({ postId, parentId: replyTo?.id ?? null, body });
              if (res.ok) {
                setBody("");
                setReplyTo(null);
                router.refresh();
              } else toast(res.error, "error");
            });
          }}
        >
          {replyTo && (
            <p className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-1.5 text-caption text-fg-muted">
              {replyTo.author.displayName}님에게 답글
              <button type="button" onClick={() => setReplyTo(null)} className="font-semibold">
                취소
              </button>
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={appConfig.limits.commentBody}
              rows={1}
              placeholder="따뜻한 한마디를 남겨 주세요"
              aria-label="댓글 입력"
              className="max-h-40 min-h-11 flex-1 resize-none rounded-md border border-line-strong bg-surface px-3.5 py-2.5 outline-none focus:border-fg-muted"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <Button type="submit" loading={pending} disabled={!body.trim()}>
              등록
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-center text-caption text-fg-muted">
          <Link href={`/login?next=/p/${postId}`} className="font-semibold text-primary">
            로그인
          </Link>
          하고 댓글을 남겨 보세요.
        </p>
      )}
    </section>
  );
}
