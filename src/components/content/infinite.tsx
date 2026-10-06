"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

/**
 * 커서 기반 무한 스크롤. 화면 하단 근처에 오면 자동으로 다음 페이지를 불러오고,
 * 실패하면 '다시 시도' 버튼을 보여준다.
 */
export function useInfinite<T>(initial: T[], initialCursor: string | null, load: (cursor: string) => Promise<{ items: T[]; nextCursor: string | null }>) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  // 서버에서 새 초기 데이터가 오면(revalidate) 렌더 중에 목록을 재설정 (effect 없이)
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setItems(initial);
    setCursor(initialCursor);
  }

  const loadMore = () => {
    if (!cursor || pending) return;
    setError(false);
    start(async () => {
      try {
        const res = await load(cursor);
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
      } catch {
        setError(true);
      }
    });
  };

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || error) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMore는 cursor/pending에만 의존
  }, [cursor, error, pending]);

  const footer = (
    <div ref={sentinel} className="flex justify-center py-6">
      {pending && <Spinner className="size-6 text-fg-subtle" label="불러오는 중" />}
      {error && (
        <Button variant="secondary" size="sm" onClick={loadMore}>
          불러오지 못했어요. 다시 시도
        </Button>
      )}
    </div>
  );
  return { items, footer, hasMore: !!cursor };
}
