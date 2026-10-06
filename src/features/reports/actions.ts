"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { checkLimit } from "@/lib/rate-limit";
import { fail, fromZodError, messages, ok, type ActionResult } from "@/lib/action";
import { reportReasons } from "./reasons";


const schema = z.object({
  targetType: z.enum(["USER", "POST", "COMMENT", "GUESTBOOK", "DIARY", "PHOTO"]),
  targetId: z.string().min(1).max(40),
  reason: z.enum(reportReasons.map((r) => r.id) as [string, ...string[]]),
  detail: z.string().trim().max(500).default(""),
});

/** 신고 접수. 같은 대상은 한 번만 (운영 도구에서 status로 처리) */
export async function submitReport(input: z.input<typeof schema>): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkLimit("report", me.id))) return fail(messages.rateLimited);
  try {
    await db.report.create({ data: { ...parsed.data, reporterId: me.id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return ok(undefined, "이미 신고한 내용이에요. 검토 중이에요.");
    throw e;
  }
  return ok(undefined, "신고가 접수됐어요. 빠르게 확인할게요.");
}
