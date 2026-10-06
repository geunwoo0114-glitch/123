"use client";

import { useState, useTransition } from "react";
import { UserPlus, Check } from "lucide-react";
import type { UserCard } from "@/features/users/card";
import { sendFriendRequest } from "@/features/relationships/actions";
import { UserLink } from "@/components/user/user-link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function SuggestionRow({ user }: { user: UserCard & { reason: string } }) {
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <UserLink user={user} size="md" meta={user.reason} />
      <Button
        size="sm"
        variant={sent ? "soft" : "secondary"}
        disabled={sent}
        loading={pending}
        aria-label={`${user.displayName}에게 친구 신청`}
        icon={sent ? <Check className="size-4" /> : <UserPlus className="size-4" />}
        onClick={() =>
          start(async () => {
            const res = await sendFriendRequest({ targetId: user.id });
            if (res.ok) {
              setSent(true);
              toast(res.message ?? "친구 신청을 보냈어요.");
            } else toast(res.error, "error");
          })
        }
      >
        {sent ? "신청함" : "신청"}
      </Button>
    </li>
  );
}

export function SuggestionList({ users }: { users: (UserCard & { reason: string })[] }) {
  return (
    <ul className="divide-y divide-line">
      {users.map((u) => (
        <SuggestionRow key={u.id} user={u} />
      ))}
    </ul>
  );
}
