"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserCard } from "@/features/users/card";
import { setBlock } from "@/features/relationships/actions";
import { UserLink } from "@/components/user/user-link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function BlockedList({ users }: { users: UserCard[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <section className="space-card p-5">
      <h2 className="text-title font-bold">차단한 사용자</h2>
      {users.length === 0 ? (
        <p className="mt-2 text-caption text-fg-muted">차단한 사용자가 없어요.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 py-2.5">
              <UserLink user={u} size="sm" />
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await setBlock({ targetId: u.id, block: false });
                    toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
                    router.refresh();
                  })
                }
              >
                해제
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
