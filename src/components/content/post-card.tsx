"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, DoorOpen, Pin, Link2 } from "lucide-react";
import type { PostDTO } from "@/features/posts/queries";
import { deletePost, setPinnedPost, toggleLike } from "@/features/posts/actions";
import { moodById } from "@/features/posts/schemas";
import { relativeTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/confirm";
import { UserLink, spaceHref } from "@/components/user/user-link";
import { PostPhotos } from "@/components/media/photo-grid";
import { RichText } from "./rich-text";
import { VisibilityIcon } from "./visibility-picker";
import { ReportDialog } from "./report-dialog";

export function LikeButton({ postId, liked, count, disabled }: { postId: string; liked: boolean; count: number; disabled?: boolean }) {
  const [state, setState] = useState({ liked, count });
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [, start] = useTransition();
  const [bump, setBump] = useState(0);
  const toast = useToast();
  const router = useRouter();

  function onClick() {
    if (disabled) {
      router.push("/login");
      return;
    }
    const next = !optimistic.liked;
    if (next) setBump((b) => b + 1);
    start(async () => {
      setOptimistic({ liked: next, count: optimistic.count + (next ? 1 : -1) });
      const res = await toggleLike(postId, next);
      if (res.ok && res.data) setState({ liked: res.data.liked, count: res.data.likeCount });
      else if (!res.ok) toast(res.error, "error"); // 실패 시 optimistic 값이 자동으로 되돌아감
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? "좋아요 취소" : "좋아요"}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-caption font-medium transition-colors hover:bg-surface-muted", optimistic.liked ? "text-[#e0475f]" : "text-fg-muted")}
    >
      <Heart key={bump} className={cn("size-[18px]", optimistic.liked && "animate-pop fill-current")} />
      <span className="tabular-nums">{optimistic.count > 0 ? optimistic.count : ""}</span>
    </button>
  );
}

export function PostCard({ post, viewerId, pinned, showVisitCta = true, isPinnable }: { post: PostDTO; viewerId: string | null; pinned?: boolean; showVisitCta?: boolean; isPinnable?: boolean }) {
  const mine = viewerId === post.author.id;
  const [confirm, setConfirm] = useState(false);
  const [report, setReport] = useState(false);
  const [pending, start] = useTransition();
  const [deleted, setDeleted] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const mood = moodById(post.mood);

  if (deleted) return null;

  const items: MenuItem[] = [
    {
      label: "링크 복사",
      icon: <Link2 className="size-4" />,
      onSelect: async () => {
        try {
          await navigator.clipboard.writeText(`${location.origin}/p/${post.id}`);
          toast("링크를 복사했어요.");
        } catch {
          toast("복사하지 못했어요.", "error");
        }
      },
    },
  ];
  if (mine) {
    items.push({ label: "수정", onSelect: () => router.push(`/p/${post.id}/edit`) });
    if (isPinnable)
      items.push({
        label: pinned ? "대표 글 고정 해제" : "대표 글로 고정",
        icon: <Pin className="size-4" />,
        onSelect: () => start(async () => {
          const res = await setPinnedPost(pinned ? null : post.id);
          toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
        }),
      });
    items.push({ label: "삭제", danger: true, onSelect: () => setConfirm(true) });
  } else if (viewerId) {
    items.push({ label: "신고", danger: true, onSelect: () => setReport(true) });
  }

  return (
    <article className="space-card animate-fade-up overflow-hidden" aria-label={`${post.author.displayName}의 소식`}>
      {pinned && (
        <div className="flex items-center gap-1.5 bg-accent-soft px-4 py-1.5 text-label font-semibold text-accent">
          <Pin className="size-3.5" /> 대표 글
        </div>
      )}
      <header className="flex items-start justify-between gap-2 px-4 pt-4">
        <UserLink
          user={post.author}
          meta={
            <span className="inline-flex items-center gap-1">
              <Link href={`/p/${post.id}`} className="hover:underline">
                <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
              </Link>
              {post.edited && <span>· 수정됨</span>}
              <span aria-hidden>·</span>
              <VisibilityIcon value={post.visibility} />
            </span>
          }
        />
        <Menu items={items} />
      </header>
      <div className="space-y-3 px-4 pt-3">
        {mood && (
          <p className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-0.5 text-caption text-fg-muted">
            {mood.emoji} {mood.label}
          </p>
        )}
        {post.body && <RichText text={post.body} />}
        {post.linkUrl && (
          <a href={post.linkUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-caption text-fg-muted hover:bg-surface-muted">
            <Link2 className="size-4 shrink-0" />
            <span className="truncate">{post.linkUrl.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
        <PostPhotos images={post.images} label={`${post.author.displayName}의 소식`} />
      </div>
      <footer className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center">
          <LikeButton postId={post.id} liked={post.likedByMe} count={post.likeCount} disabled={!viewerId} />
          <Link href={`/p/${post.id}#comments`} className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-caption font-medium text-fg-muted hover:bg-surface-muted" aria-label={`댓글 ${post.commentCount}개`}>
            <MessageCircle className="size-[18px]" />
            <span className="tabular-nums">{post.commentCount > 0 ? post.commentCount : ""}</span>
          </Link>
        </div>
        {showVisitCta && !mine && (
          <Link href={spaceHref(post.author.username)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-caption font-semibold text-accent hover:bg-accent-soft">
            <DoorOpen className="size-4" /> {post.author.displayName}네 놀러가기
          </Link>
        )}
      </footer>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="이 소식을 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요."
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await deletePost(post.id);
            setConfirm(false);
            toast(res.ok ? (res.message ?? "삭제했어요.") : res.error, res.ok ? "success" : "error");
            if (res.ok) setDeleted(true);
          })
        }
      />
      {report && <ReportDialog open={report} onClose={() => setReport(false)} targetType="POST" targetId={post.id} />}
    </article>
  );
}
