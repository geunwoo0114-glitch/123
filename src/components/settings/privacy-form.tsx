"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePrivacy } from "@/features/space/actions";
import { Button } from "@/components/ui/button";
import { Select, Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

type State = {
  spaceVisibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  guestbookPolicy: "EVERYONE" | "FRIENDS" | "NOBODY";
  messagePolicy: "EVERYONE" | "FRIENDS" | "NOBODY";
  leaveVisitTraces: boolean;
  showVisitorsPublic: boolean;
  discoverable: boolean;
  allowFriendRequests: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyGuestbook: boolean;
  notifyFollows: boolean;
};

export function PrivacyForm({ initial }: { initial: State }) {
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const set = <K extends keyof State>(k: K) => (v: State[K]) => setS((p) => ({ ...p, [k]: v }));
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updatePrivacy(s);
          toast(res.ok ? (res.message ?? "저장했어요.") : res.error, res.ok ? "success" : "error");
          if (res.ok) router.refresh();
        });
      }}
    >
      <section className="space-card p-5">
        <h2 className="mb-3 text-title font-bold">공간 · 방명록 · 쪽지</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="내 공간 둘러보기" value={s.spaceVisibility} onChange={(e) => set("spaceVisibility")(e.target.value as State["spaceVisibility"])} hint="비공개여도 프로필 카드(이름·미니미·상태)는 보여요.">
            <option value="PUBLIC">누구나</option>
            <option value="FRIENDS">친구만</option>
            <option value="PRIVATE">나만</option>
          </Select>
          <Select label="방명록 쓰기" value={s.guestbookPolicy} onChange={(e) => set("guestbookPolicy")(e.target.value as State["guestbookPolicy"])}>
            <option value="EVERYONE">로그인한 누구나</option>
            <option value="FRIENDS">친구만</option>
            <option value="NOBODY">닫아두기</option>
          </Select>
          <Select label="쪽지 받기" value={s.messagePolicy} onChange={(e) => set("messagePolicy")(e.target.value as State["messagePolicy"])} hint="모르는 사람의 쪽지가 부담되면 '친구만'을 추천해요.">
            <option value="FRIENDS">친구만</option>
            <option value="EVERYONE">로그인한 누구나</option>
            <option value="NOBODY">받지 않기</option>
          </Select>
        </div>
      </section>
      <section className="space-card divide-y divide-line px-5 py-2">
        <h2 className="py-3 text-title font-bold">방문 흔적</h2>
        <Switch checked={s.leaveVisitTraces} onChange={set("leaveVisitTraces")} label="다른 공간에 방문 흔적 남기기" description="끄면 내가 놀러 가도 방문자 수에만 집계되고 누군지는 남지 않아요." />
        <Switch checked={s.showVisitorsPublic} onChange={set("showVisitorsPublic")} label="'최근 다녀간 사람'을 방문자에게도 보여주기" description="끄면 나만 볼 수 있어요." />
      </section>
      <section className="space-card divide-y divide-line px-5 py-2">
        <h2 className="py-3 text-title font-bold">발견과 관계</h2>
        <Switch checked={s.discoverable} onChange={set("discoverable")} label="검색과 친구 추천에 나타나기" />
        <Switch checked={s.allowFriendRequests} onChange={set("allowFriendRequests")} label="친구 신청 받기" />
      </section>
      <section className="space-card divide-y divide-line px-5 py-2">
        <h2 className="py-3 text-title font-bold">알림</h2>
        <Switch checked={s.notifyGuestbook} onChange={set("notifyGuestbook")} label="방명록" />
        <Switch checked={s.notifyComments} onChange={set("notifyComments")} label="댓글과 답글" />
        <Switch checked={s.notifyLikes} onChange={set("notifyLikes")} label="좋아요" />
        <Switch checked={s.notifyFollows} onChange={set("notifyFollows")} label="새로 소식 받는 사람" />
        <p className="py-3 text-label text-fg-subtle">친구 신청과 수락 알림은 항상 받아요.</p>
      </section>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          저장
        </Button>
      </div>
    </form>
  );
}
