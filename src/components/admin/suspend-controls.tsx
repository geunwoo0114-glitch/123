"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserSuspended } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function SuspendForm() {
  const [username, setUsername] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <form
      className="space-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await setUserSuspended({ username, suspended: true, note });
          toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
          if (res.ok) {
            setUsername("");
            setNote("");
            router.refresh();
          }
        });
      }}
    >
      <Input label="아이디" prefix="@" value={username} onChange={(e) => setUsername(e.target.value)} wrapClassName="flex-1" />
      <Input label="사유 (기록용)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} wrapClassName="flex-1" />
      <Button type="submit" variant="danger" loading={pending} disabled={!username.trim()}>
        정지
      </Button>
    </form>
  );
}

export function UnsuspendButton({ username }: { username: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await setUserSuspended({ username, suspended: false });
          toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
          router.refresh();
        })
      }
    >
      정지 해제
    </Button>
  );
}
