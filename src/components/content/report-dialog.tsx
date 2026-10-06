"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { submitReport } from "@/features/reports/actions";
import { reportReasons } from "@/features/reports/reasons";
import { cn } from "@/lib/cn";

type Target = "USER" | "POST" | "COMMENT" | "GUESTBOOK" | "DIARY" | "PHOTO";

export function ReportDialog({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: Target; targetId: string }) {
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="신고하기"
      description="신고 내용은 상대방에게 알려지지 않아요."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="danger"
            disabled={!reason}
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await submitReport({ targetType, targetId, reason, detail });
                toast(res.ok ? (res.message ?? "신고했어요.") : res.error, res.ok ? "success" : "error");
                if (res.ok) onClose();
              })
            }
          >
            신고하기
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="신고 사유" className="mb-3 flex flex-wrap gap-2">
        {reportReasons.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={reason === r.id}
            onClick={() => setReason(r.id)}
            className={cn("rounded-full border px-3 py-1.5 text-caption font-medium", reason === r.id ? "border-danger bg-danger-soft text-danger" : "border-line-strong text-fg-muted")}
          >
            {r.label}
          </button>
        ))}
      </div>
      <Textarea label="자세한 내용 (선택)" value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={500} showCount minRows={2} />
    </Dialog>
  );
}
