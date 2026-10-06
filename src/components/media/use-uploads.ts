"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaDTO } from "@/features/media/service";
import { appConfig } from "@/config/app";

export type UploadItem = {
  localId: string;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  media?: MediaDTO;
  error?: string;
};

/** 파일을 하나씩 업로드하고 미리보기/상태를 관리한다 */
export function useUploads(max: number, initial: MediaDTO[] = []) {
  const [items, setItems] = useState<UploadItem[]>(() =>
    initial.map((m) => ({ localId: m.id, previewUrl: `/media/${m.thumbKey}`, status: "done", media: m })),
  );
  const objectUrls = useRef<string[]>([]);
  useEffect(() => () => objectUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const add = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const room = max - items.length;
      const accepted = list.slice(0, Math.max(0, room));
      const queued: UploadItem[] = accepted.map((f) => {
        const url = URL.createObjectURL(f);
        objectUrls.current.push(url);
        const tooBig = f.size > appConfig.upload.maxBytes;
        return {
          localId: crypto.randomUUID(),
          previewUrl: url,
          status: tooBig ? "error" : "uploading",
          error: tooBig ? "12MB 이하만 가능해요" : undefined,
        };
      });
      setItems((prev) => [...prev, ...queued]);

      await Promise.all(
        accepted.map(async (file, i) => {
          const q = queued[i];
          if (q.status === "error") return;
          const body = new FormData();
          body.append("file", file);
          try {
            const res = await fetch("/api/uploads", { method: "POST", body });
            const json = (await res.json()) as { ok: boolean; media?: MediaDTO; error?: string };
            setItems((prev) =>
              prev.map((it) =>
                it.localId === q.localId
                  ? json.ok && json.media
                    ? { ...it, status: "done", media: json.media }
                    : { ...it, status: "error", error: json.error ?? "업로드 실패" }
                  : it,
              ),
            );
          } catch {
            setItems((prev) => prev.map((it) => (it.localId === q.localId ? { ...it, status: "error", error: "네트워크 오류" } : it)));
          }
        }),
      );
      return list.length - accepted.length;
    },
    [items.length, max],
  );

  const remove = useCallback((localId: string) => setItems((prev) => prev.filter((i) => i.localId !== localId)), []);
  const move = useCallback((localId: string, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.localId === localId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);
  const reset = useCallback(() => setItems([]), []);

  const mediaIds = items.filter((i) => i.status === "done" && i.media).map((i) => i.media!.id);
  const uploading = items.some((i) => i.status === "uploading");
  return { items, add, remove, move, reset, mediaIds, uploading };
}
