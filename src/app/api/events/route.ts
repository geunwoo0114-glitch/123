import { getCurrentUser } from "@/lib/auth/session";
import { subscribe, type RealtimeEvent } from "@/lib/realtime/hub";

export const dynamic = "force-dynamic";

/** 로그인 사용자 전용 Server-Sent Events 스트림 (쪽지·알림 실시간 전달) */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const unsubscribe = await subscribe(me.id, (event: RealtimeEvent) => send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
      // 프록시가 연결을 끊지 않도록 주기적으로 주석 전송
      const heartbeat = setInterval(() => send(": ping\n\n"), 25_000);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* 이미 닫힘 */
        }
      });
      send("retry: 5000\n: connected\n\n");
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
