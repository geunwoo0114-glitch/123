"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, SendHorizontal } from "lucide-react";
import type { UserCard } from "@/features/users/card";
import type { MessageDTO } from "@/features/messages/queries";
import { leaveConversation, loadOlderMessages, markConversationRead, pollMessages, sendMessage } from "@/features/messages/actions";
import { appConfig } from "@/config/app";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { ReportDialog } from "@/components/content/report-dialog";
import { useRealtime, useRealtimeConnected } from "@/components/realtime/use-realtime";

/** 실시간 연결이 없을 때의 폴링 간격 / 연결되어 있을 때의 안전망 간격 */
const POLL_MS = 4000;
const POLL_MS_LIVE = 30_000;

type Item = MessageDTO & { pending?: boolean; failed?: boolean };

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit", timeZone: appConfig.serviceTimezone }).format(new Date(iso));
}
function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: appConfig.serviceTimezone }).format(new Date(iso));
}

export function ThreadView({ other, initial, olderCursor, blockedReason }: { other: UserCard; initial: MessageDTO[]; olderCursor: string | null; blockedReason: string | null }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [cursor, setCursor] = useState(olderCursor);
  const [body, setBody] = useState("");
  const [leave, setLeave] = useState(false);
  const [report, setReport] = useState(false);
  const [loadingOlder, startOlder] = useTransition();
  const [pendingLeave, startLeave] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const toast = useToast();
  const router = useRouter();

  const lastAt = items.filter((m) => !m.pending).at(-1)?.createdAt ?? null;
  const lastAtRef = useRef(lastAt);
  useEffect(() => {
    lastAtRef.current = lastAt;
  }, [lastAt]);

  // 처음 열면 읽음 처리
  useEffect(() => {
    void markConversationRead(other.id).then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 최초 1회
  }, [other.id]);

  const live = useRealtimeConnected();

  // 실시간: 이 상대가 보낸 쪽지가 오면 바로 붙이고 읽음 처리
  useRealtime((event) => {
    if (event.type !== "dm" || event.from.id !== other.id) return;
    stickToBottom.current = true;
    setItems((prev) => (prev.some((m) => m.id === event.message.id) ? prev : [...prev, { ...event.message, mine: false }]));
    void markConversationRead(other.id);
  });

  // 폴링: 실시간 연결이 끊겼을 때의 대체 수단 (연결 중에는 30초 안전망)
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const fresh = await pollMessages(other.id, lastAtRef.current);
        if (fresh.length) {
          setItems((prev) => {
            const known = new Set(prev.map((m) => m.id));
            return [...prev, ...fresh.filter((m) => !known.has(m.id))];
          });
        }
      } catch {
        /* 네트워크 일시 오류는 다음 주기에 재시도 */
      }
    }, live ? POLL_MS_LIVE : POLL_MS);
    return () => clearInterval(id);
  }, [other.id, live]);

  useLayoutEffect(() => {
    const el = list.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [items]);

  function send() {
    const text = body.trim();
    if (!text) return;
    const temp: Item = { id: `tmp-${Date.now()}`, body: text, createdAt: new Date().toISOString(), mine: true, pending: true };
    stickToBottom.current = true;
    setItems((prev) => [...prev, temp]);
    setBody("");
    void sendMessage({ toUserId: other.id, body: text }).then((res) => {
      if (res.ok && res.data) {
        const sent = res.data;
        setItems((prev) => prev.map((m) => (m.id === temp.id ? sent : m)));
      } else {
        setItems((prev) => prev.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)));
        toast(res.ok ? "보내지 못했어요." : res.error, "error");
      }
    });
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px-env(safe-area-inset-bottom))] max-w-[680px] flex-col lg:h-dvh">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2">
        <Link href="/messages" aria-label="쪽지함으로" className="rounded-full p-2 text-fg-muted hover:bg-surface-muted">
          <ChevronLeft className="size-5" />
        </Link>
        <Link href={`/@${other.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={other.displayName} avatarKey={other.avatarKey} minimi={other.minimi} size="sm" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-semibold">{other.displayName}</span>
            <span className="block truncate text-label text-fg-subtle">{other.statusMessage ? `${other.statusEmoji} ${other.statusMessage}` : `@${other.username}`}</span>
          </span>
        </Link>
        <Menu
          items={[
            { label: `${other.displayName}네 놀러가기`, onSelect: () => router.push(`/@${other.username}`) },
            { label: "대화방 나가기", danger: true, onSelect: () => setLeave(true) },
            { label: "신고", danger: true, onSelect: () => setReport(true) },
          ]}
        />
      </header>

      <div
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label={`${other.displayName}님과의 쪽지`}
      >
        {cursor && (
          <div className="mb-3 flex justify-center">
            <Button
              size="sm"
              variant="soft"
              loading={loadingOlder}
              onClick={() =>
                startOlder(async () => {
                  stickToBottom.current = false;
                  const res = await loadOlderMessages(other.id, cursor);
                  setItems((prev) => [...res.items, ...prev]);
                  setCursor(res.nextCursor);
                })
              }
            >
              이전 쪽지 보기
            </Button>
          </div>
        )}
        {items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Avatar name={other.displayName} avatarKey={other.avatarKey} minimi={other.minimi} size="xl" />
            <p className="font-semibold">{other.displayName}님에게 첫 쪽지를 보내 보세요</p>
            <p className="text-caption text-fg-muted">쪽지는 두 사람만 볼 수 있어요.</p>
          </div>
        )}
        <ol className="flex flex-col gap-1.5">
          {items.map((m, i) => {
            const prev = items[i - 1];
            const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
            const next = items[i + 1];
            const lastOfGroup = !next || next.mine !== m.mine || dayKey(next.createdAt) !== dayKey(m.createdAt);
            return (
              <li key={m.id}>
                {newDay && (
                  <p className="my-3 text-center text-label text-fg-subtle">
                    <span className="rounded-full bg-surface-muted px-3 py-1">{formatDate(m.createdAt, { withYear: true, weekday: true })}</span>
                  </p>
                )}
                <div className={cn("flex items-end gap-1.5", m.mine ? "flex-row-reverse" : "flex-row")}>
                  <p
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-body whitespace-pre-wrap",
                      m.mine ? "rounded-br-md bg-primary text-on-primary" : "rounded-bl-md bg-surface text-fg shadow-1",
                      m.pending && "opacity-60",
                      m.failed && "bg-danger",
                    )}
                  >
                    {m.body}
                  </p>
                  {lastOfGroup && <span className="shrink-0 pb-0.5 text-[11px] text-fg-subtle">{m.failed ? "실패" : m.pending ? "보내는 중" : timeLabel(m.createdAt)}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {blockedReason ? (
        <p className="shrink-0 border-t border-line bg-surface px-4 py-4 text-center text-caption text-fg-muted">{blockedReason}</p>
      ) : (
        <form
          className="flex shrink-0 items-end gap-2 border-t border-line bg-surface px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={appConfig.limits.message}
            rows={1}
            placeholder="쪽지를 입력하세요"
            aria-label="쪽지 내용"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-surface-muted px-4 py-2.5 outline-none focus:ring-2 focus:ring-[var(--focus)]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button type="submit" disabled={!body.trim()} aria-label="보내기" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition active:scale-95 disabled:opacity-40">
            <SendHorizontal className="size-5" />
          </button>
        </form>
      )}

      <ConfirmDialog
        open={leave}
        onClose={() => setLeave(false)}
        title="대화방을 나갈까요?"
        description="내 쪽지함에서만 지금까지의 대화가 사라져요. 상대방에게는 남아 있어요."
        confirmLabel="나가기"
        pending={pendingLeave}
        onConfirm={() =>
          startLeave(async () => {
            const res = await leaveConversation(other.id);
            toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
            if (res.ok) router.push("/messages");
          })
        }
      />
      {report && <ReportDialog open onClose={() => setReport(false)} targetType="USER" targetId={other.id} />}
    </div>
  );
}
