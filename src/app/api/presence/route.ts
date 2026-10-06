import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { checkLimit } from "@/lib/rate-limit";
import { getSpace } from "@/features/space/queries";
import { leavePresence, listPresent, prunePresence, touchPresence } from "@/features/presence/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ username: z.string().min(1).max(40), leave: z.boolean().optional() });

/** 다른 사이트에서 보낸 요청(sendBeacon 포함)은 받지 않는다 */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

/**
 * 공간에 '지금 머무는 중' 신호를 보내고, 같은 공간에 있는 사람 목록을 받는다.
 * 로그인 사용자만, 그리고 그 공간을 볼 수 있는 사람만 쓸 수 있다.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "unauthorized" }, { status: 401 });

  let parsed;
  try {
    // sendBeacon은 text/plain으로 보내므로 본문을 직접 파싱한다
    parsed = bodySchema.safeParse(JSON.parse(await req.text()));
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  const space = await getSpace(parsed.data.username, me.id);
  if (!space || !space.canView || space.relation.state === "BLOCKED") return Response.json({ error: "not_found" }, { status: 404 });
  const hostId = space.owner.id;

  if (parsed.data.leave) {
    await leavePresence(hostId, me.id);
    return new Response(null, { status: 204 });
  }
  if (!(await checkLimit("presence", me.id))) return Response.json({ error: "rate_limited" }, { status: 429 });

  const visible = await touchPresence(hostId, me.id);
  if (Math.random() < 0.02) await prunePresence();
  const people = await listPresent(hostId, me.id);
  return Response.json({ visible, people }, { headers: { "Cache-Control": "no-store" } });
}
