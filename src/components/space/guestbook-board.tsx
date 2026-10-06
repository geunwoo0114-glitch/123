"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, MessageSquareHeart, CornerDownRight } from "lucide-react";
import type { GuestbookEntryDTO } from "@/features/guestbook/queries";
import { deleteGuestbook, loadMoreGuestbook, replyGuestbook, writeGuestbook } from "@/features/guestbook/actions";
import { guestbookStickers, stickerById } from "@/features/guestbook/schemas";
import { appConfig } from "@/config/app";
import { relativeTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { UserLink } from "@/components/user/user-link";
import { ReportDialog } from "@/components/content/report-dialog";
import { useInfinite } from "@/components/content/infinite";
import { EmptyState } from "@/components/ui/misc";

function WriteForm({ hostId, hostName }: { hostId: string; hostName: string }) {
  const [body, setBody] = useState("");
  const [sticker, setSticker] = useState("cat");
  const [secret, setSecret] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const paper = stickerById(sticker).paper;
  return (
    <form
      id="write"
      className="space-card scroll-mt-28 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await writeGuestbook({ hostId, body, isSecret: secret, sticker });
          if (res.ok) {
            setBody("");
            setSecret(false);
            toast(res.message ?? "남겼어요.");
            router.refresh();
          } else toast(res.error, "error");
        });
      }}
    >
      <div className="rounded-md p-3 transition-colors" style={{ backgroundColor: paper }}>
        <Textarea
          aria-label="방명록 내용"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`${hostName}님의 공간에 흔적을 남겨보세요 ✍️`}
          maxLength={appConfig.limits.guestbookBody}
          showCount
          minRows={3}
          className="border-0 bg-transparent px-1 text-[#2b2320] placeholder:text-[#9a9187] focus:ring-0"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="radiogroup" aria-label="메모지 스티커">
          {guestbookStickers.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={sticker === s.id}
              aria-label={s.id}
              onClick={() => setSticker(s.id)}
              className={cn("size-9 rounded-full text-[18px] transition-transform", sticker === s.id ? "scale-110 ring-2 ring-fg" : "opacity-70 hover:opacity-100")}
              style={{ backgroundColor: s.paper }}
            >
              {s.emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-caption text-fg-muted select-none">
            <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} className="size-4 accent-[var(--space-accent)]" />
            <Lock className="size-3.5" /> 비밀글
          </label>
          <Button type="submit" variant="accent" loading={pending} disabled={!body.trim()}>
            남기기
          </Button>
        </div>
      </div>
    </form>
  );
}

function Note({ entry, viewerId, onRemoved }: { entry: GuestbookEntryDTO; viewerId: string | null; onRemoved: (id: string) => void }) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(entry.reply ?? "");
  const [confirm, setConfirm] = useState(false);
  const [report, setReport] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const sticker = stickerById(entry.sticker);

  if (entry.hidden) {
    return (
      <li className="flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-5 text-caption text-fg-subtle">
        <Lock className="size-4" /> 비밀 방명록이에요 · {relativeTime(entry.createdAt)}
      </li>
    );
  }

  const items: MenuItem[] = [];
  if (entry.canReply) items.push({ label: entry.reply ? "답글 고치기" : "답글 달기", onSelect: () => setReplying(true) });
  if (entry.canDelete) items.push({ label: "삭제", danger: true, onSelect: () => setConfirm(true) });
  if (viewerId && entry.author && entry.author.id !== viewerId) items.push({ label: "신고", danger: true, onSelect: () => setReport(true) });

  return (
    <li className="animate-fade-up relative rounded-lg p-4 text-[#2b2320] shadow-1" style={{ backgroundColor: sticker.paper }}>
      <span className="absolute -top-3 left-4 text-[24px] drop-shadow-sm" aria-hidden>
        {sticker.emoji}
      </span>
      <div className="flex items-start justify-between gap-2 pt-1">
        {entry.author && (
          <div className="[&_*]:!text-[#2b2320] [&_.text-fg-subtle]:!text-[#857c72]">
            <UserLink user={entry.author} size="sm" meta={relativeTime(entry.createdAt)} />
          </div>
        )}
        <div className="flex items-center gap-1">
          {entry.isSecret && <Lock className="size-3.5 text-[#857c72]" aria-label="비밀글" />}
          <Menu items={items} />
        </div>
      </div>
      <p className="mt-2 text-body whitespace-pre-wrap">{entry.body}</p>
      {entry.reply && !replying && (
        <p className="mt-3 flex gap-1.5 rounded-md bg-white/60 px-3 py-2 text-caption">
          <CornerDownRight className="mt-0.5 size-3.5 shrink-0" />
          <span className="whitespace-pre-wrap">{entry.reply}</span>
        </p>
      )}
      {replying && (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await replyGuestbook({ entryId: entry.id, reply });
              toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
              if (res.ok) {
                setReplying(false);
                router.refresh();
              }
            });
          }}
        >
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={appConfig.limits.guestbookBody} rows={2} autoFocus aria-label="답글" className="rounded-md bg-white/80 px-3 py-2 text-caption outline-none focus:ring-2 focus:ring-[var(--focus)]" />
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
              취소
            </Button>
            <Button size="sm" type="submit" loading={pending}>
              저장
            </Button>
          </div>
        </form>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="방명록을 삭제할까요?"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await deleteGuestbook(entry.id);
            setConfirm(false);
            toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
            if (res.ok) onRemoved(entry.id);
          })
        }
      />
      {report && <ReportDialog open onClose={() => setReport(false)} targetType="GUESTBOOK" targetId={entry.id} />}
    </li>
  );
}

export function GuestbookBoard({
  hostId,
  hostName,
  initial,
  nextCursor,
  canWrite,
  closedReason,
  isOwner,
  viewerId,
}: {
  hostId: string;
  hostName: string;
  initial: GuestbookEntryDTO[];
  nextCursor: string | null;
  canWrite: boolean;
  closedReason: string | null;
  isOwner: boolean;
  viewerId: string | null;
}) {
  const { items, footer } = useInfinite(initial, nextCursor, (c) => loadMoreGuestbook(hostId, c));
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const shown = items.filter((i) => !removed.has(i.id));
  return (
    <div className="flex flex-col gap-4">
      {canWrite && <WriteForm hostId={hostId} hostName={hostName} />}
      {closedReason && <p className="space-card px-4 py-3 text-caption text-fg-muted">{closedReason}</p>}
      {shown.length === 0 ? (
        <div className="space-card">
          <EmptyState icon={<MessageSquareHeart />} title={isOwner ? "아직 방명록이 비어 있어요" : "첫 번째 방문 흔적을 남겨보세요!"} description={isOwner ? "공간 링크를 친구에게 공유해 보세요." : undefined} />
        </div>
      ) : (
        <ul className="grid gap-5 pt-2 sm:grid-cols-2">
          {shown.map((e) => (
            <Note key={e.id} entry={e} viewerId={viewerId} onRemoved={(id) => setRemoved((s) => new Set(s).add(id))} />
          ))}
        </ul>
      )}
      {footer}
    </div>
  );
}
