"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#f6f3ee" }}>
        <div style={{ textAlign: "center" }}>
          <h1>잠깐 문제가 생겼어요</h1>
          <button onClick={reset} style={{ padding: "10px 18px", borderRadius: 10, border: 0, background: "#e2582f", color: "#fff", fontWeight: 600 }}>
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
