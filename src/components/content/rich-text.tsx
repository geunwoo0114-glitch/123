import Link from "next/link";
import { Fragment } from "react";

const TOKEN = /(#[\p{L}\p{N}_]{1,20}|https?:\/\/[^\s<]+)/gu;

/** 본문 텍스트: 줄바꿈 유지 + #태그/링크만 변환 (HTML 해석 없음 → XSS 안전) */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN);
  return (
    <p className={className ?? "whitespace-pre-wrap text-body text-fg"}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          if (part.startsWith("#")) {
            return (
              <Link key={i} href={`/explore?q=${encodeURIComponent(part)}`} className="font-medium text-accent hover:underline">
                {part}
              </Link>
            );
          }
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all text-accent underline-offset-2 hover:underline">
              {part.replace(/^https?:\/\//, "").slice(0, 48)}
              {part.length > 56 ? "…" : ""}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </p>
  );
}
