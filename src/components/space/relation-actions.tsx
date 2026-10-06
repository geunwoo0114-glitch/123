"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Clock, Check, Bell, BellOff, Palette, PenLine } from "lucide-react";
import type { Relation } from "@/features/privacy/policy";
import { removeFriendship, respondFriendRequest, sendFriendRequest, setBlock, setFollow, setFriendLabel, toggleCloseFriend } from "@/features/relationships/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/field";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { ReportDialog } from "@/components/content/report-dialog";
import { brand } from "@/config/brand";

type Props = { ownerId: string; ownerName: string; relation: Relation; friendLabel: string | null; loggedIn: boolean };

export function RelationActions({ ownerId, ownerName, relation, friendLabel, loggedIn }: Props) {
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<null | "request" | "label" | "unfriend" | "block" | "report">(null);
  const [label, setLabel] = useState(friendLabel ?? "");
  const [message, setMessage] = useState("");
  const toast = useToast();
  const router = useRouter();

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (res.message) toast(res.message);
        after?.();
        router.refresh();
      } else toast(res.error ?? "문제가 생겼어요.", "error");
    });
  }

  if (relation.state === "SELF") {
    return (
      <div className="flex gap-2">
        <ButtonLink href="/settings/space" variant="accent" size="md" className="flex-1" icon={<Palette className="size-4" />}>
          {brand.spaceNoun} 꾸미기
        </ButtonLink>
        <ButtonLink href="/settings" variant="secondary" size="md" className="flex-1" icon={<PenLine className="size-4" />}>
          프로필 편집
        </ButtonLink>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <ButtonLink href="/signup" variant="accent" className="w-full" icon={<UserPlus className="size-4" />}>
        가입하고 친구 신청하기
      </ButtonLink>
    );
  }

  const menu: MenuItem[] = [];
  if (relation.state === "FRIENDS") {
    menu.push({ label: "우리 사이 이름 바꾸기", onSelect: () => setDialog("label") });
    menu.push({
      label: relation.isCloseFriend ? "친한 친구에서 빼기" : "친한 친구로 지정",
      onSelect: () => run(() => toggleCloseFriend({ targetId: ownerId, close: !relation.isCloseFriend })),
    });
    menu.push({ label: "친구 끊기", danger: true, onSelect: () => setDialog("unfriend") });
  }
  if (relation.state !== "BLOCKED") menu.push({ label: "차단", danger: true, onSelect: () => setDialog("block") });
  menu.push({ label: "신고", danger: true, onSelect: () => setDialog("report") });

  let primary: React.ReactNode;
  switch (relation.state) {
    case "FRIENDS":
      primary = (
        <Button variant="soft" className="flex-1" icon={<UserCheck className="size-4" />} onClick={() => setDialog("label")}>
          {friendLabel ? `${friendLabel}` : "친구"}
        </Button>
      );
      break;
    case "REQUEST_SENT":
      primary = (
        <Button variant="secondary" className="flex-1" loading={pending} icon={<Clock className="size-4" />} onClick={() => run(() => removeFriendship({ targetId: ownerId }))}>
          신청 취소
        </Button>
      );
      break;
    case "REQUEST_RECEIVED":
      primary = (
        <div className="flex flex-1 gap-2">
          <Button variant="accent" className="flex-1" loading={pending} icon={<Check className="size-4" />} onClick={() => run(() => respondFriendRequest({ targetId: ownerId, accept: true }))}>
            수락
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => run(() => respondFriendRequest({ targetId: ownerId, accept: false }))}>
            거절
          </Button>
        </div>
      );
      break;
    case "BLOCKED":
      primary = (
        <Button variant="secondary" className="flex-1" loading={pending} onClick={() => run(() => setBlock({ targetId: ownerId, block: false }))}>
          차단 해제
        </Button>
      );
      break;
    default:
      primary = (
        <Button variant="accent" className="flex-1" icon={<UserPlus className="size-4" />} onClick={() => setDialog("request")}>
          친구 신청
        </Button>
      );
  }

  return (
    <div className="flex items-center gap-2">
      {primary}
      {relation.state !== "BLOCKED" && relation.state !== "FRIENDS" && (
        <Button
          variant="secondary"
          aria-pressed={relation.isFollowing}
          disabled={pending}
          icon={relation.isFollowing ? <BellOff className="size-4" /> : <Bell className="size-4" />}
          onClick={() => run(() => setFollow({ targetId: ownerId, follow: !relation.isFollowing }))}
        >
          {relation.isFollowing ? "소식 끄기" : "소식 받기"}
        </Button>
      )}
      <Menu items={menu} />

      <Dialog
        open={dialog === "request"}
        onClose={() => setDialog(null)}
        title={`${ownerName}님에게 친구 신청`}
        description="서로 수락하면 친구 공개 글과 공간을 함께 볼 수 있어요."
        size="sm"
        footer={
          <Button variant="accent" loading={pending} onClick={() => run(() => sendFriendRequest({ targetId: ownerId, label, message }), () => setDialog(null))}>
            신청 보내기
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="우리 사이 이름 (선택)" placeholder="예: 고딩친구, 회사동기, 덕메" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={12} hint={`내가 ${ownerName}님을 부르는 이름이에요.`} />
          <Textarea label="인사 한마디 (선택)" placeholder="반가워요! 사진 보고 놀러왔어요 :)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={100} showCount minRows={2} />
        </div>
      </Dialog>

      <Dialog
        open={dialog === "label"}
        onClose={() => setDialog(null)}
        title="우리 사이 이름"
        description={`${ownerName}님을 어떻게 부를까요? 친구 목록과 공간에 표시돼요.`}
        size="sm"
        footer={
          <Button loading={pending} onClick={() => run(() => setFriendLabel({ targetId: ownerId, label }), () => setDialog(null))}>
            저장
          </Button>
        }
      >
        <Input aria-label="우리 사이 이름" placeholder="예: 고딩친구" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={12} />
      </Dialog>

      <ConfirmDialog
        open={dialog === "unfriend"}
        onClose={() => setDialog(null)}
        title={`${ownerName}님과 친구를 끊을까요?`}
        description="상대방에게 알림은 가지 않아요."
        confirmLabel="친구 끊기"
        pending={pending}
        onConfirm={() => run(() => removeFriendship({ targetId: ownerId }), () => setDialog(null))}
      />
      <ConfirmDialog
        open={dialog === "block"}
        onClose={() => setDialog(null)}
        title={`${ownerName}님을 차단할까요?`}
        description="서로의 공간, 글, 방명록을 볼 수 없고 친구 관계도 정리돼요. 상대방에게 알림은 가지 않아요."
        confirmLabel="차단"
        pending={pending}
        onConfirm={() => run(() => setBlock({ targetId: ownerId, block: true }), () => setDialog(null))}
      />
      {dialog === "report" && <ReportDialog open onClose={() => setDialog(null)} targetType="USER" targetId={ownerId} />}
    </div>
  );
}
