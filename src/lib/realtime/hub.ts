import "server-only";
import { Client } from "pg";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * 실시간 이벤트 허브.
 * - 발행: Postgres NOTIFY (여러 서버 인스턴스에 모두 전달된다)
 * - 수신: 인스턴스마다 LISTEN 연결 1개 → 이 인스턴스에 접속한 사용자의 SSE 스트림으로 전달
 * Redis 같은 별도 인프라 없이 시작하고, 규모가 커지면 이 모듈만 교체한다.
 */
const CHANNEL = "darak_events";

export type RealtimeEvent =
  | { type: "dm"; from: { id: string; username: string }; message: { id: string; body: string; createdAt: string } }
  | { type: "notification" };

type Envelope = { to: string; event: RealtimeEvent };
type Listener = (event: RealtimeEvent) => void;

type Hub = { listeners: Map<string, Set<Listener>>; client: Client | null; connecting: Promise<void> | null };
const g = globalThis as unknown as { __darakHub?: Hub };
const hub: Hub = (g.__darakHub ??= { listeners: new Map(), client: null, connecting: null });

async function ensureListening() {
  if (hub.client) return;
  hub.connecting ??= (async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL?.split("?")[0] });
    client.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      try {
        const { to, event } = JSON.parse(msg.payload) as Envelope;
        hub.listeners.get(to)?.forEach((fn) => fn(event));
      } catch (err) {
        logger.warn("realtime payload parse failed", { err });
      }
    });
    client.on("error", (err) => {
      logger.warn("realtime listener error, reconnecting", { err });
      hub.client = null;
      hub.connecting = null;
      setTimeout(() => void ensureListening().catch(() => undefined), 2000);
    });
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    hub.client = client;
  })().finally(() => {
    hub.connecting = null;
  });
  await hub.connecting;
}

export async function subscribe(userId: string, fn: Listener): Promise<() => void> {
  await ensureListening();
  const set = hub.listeners.get(userId) ?? new Set<Listener>();
  set.add(fn);
  hub.listeners.set(userId, set);
  return () => {
    set.delete(fn);
    if (set.size === 0) hub.listeners.delete(userId);
  };
}

/** 특정 사용자에게 이벤트 발행 (실패해도 본 동작을 막지 않는다) */
export async function publish(to: string, event: RealtimeEvent): Promise<void> {
  try {
    const payload = JSON.stringify({ to, event } satisfies Envelope);
    if (Buffer.byteLength(payload) > 7900) return; // NOTIFY 페이로드 한도(8000바이트)
    await db.$executeRaw`SELECT pg_notify(${CHANNEL}, ${payload})`;
  } catch (err) {
    logger.warn("realtime publish failed", { err });
  }
}
