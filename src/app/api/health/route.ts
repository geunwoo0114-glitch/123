import { db } from "@/lib/db";

/** 헬스체크 (로드밸런서/컨테이너 오케스트레이터용): DB 연결까지 확인 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
