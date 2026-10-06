import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

/** 개발/테스트 전용: 받은 사람의 가장 최근 메일 (production에서는 존재하지 않는 경로) */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_MAIL !== "1") return new NextResponse("Not found", { status: 404 });
  const to = req.nextUrl.searchParams.get("to") ?? "";
  const mail = await db.devMail.findFirst({ where: { to }, orderBy: { createdAt: "desc" } });
  if (!mail) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, subject: mail.subject, text: mail.text });
}
