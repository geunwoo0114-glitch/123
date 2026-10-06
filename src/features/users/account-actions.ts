"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, revokeOtherSessions } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { consumeAuthToken, issueAuthToken } from "@/lib/auth/tokens";
import { appUrl, sendMail } from "@/lib/mail";
import { checkLimit, clientIp, rateLimit } from "@/lib/rate-limit";
import { fail, fromZodError, messages, ok, type ActionResult } from "@/lib/action";
import { brand } from "@/config/brand";
import { emailSchema, passwordSchema } from "./schemas";
import { sendVerificationMail } from "./verification";

export async function resendVerification(): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  if (!(await rateLimit(`verify-mail:${me.id}`, 3, 60 * 60))) return fail("잠시 후 다시 시도해 주세요. 인증 메일은 1시간에 3번까지 보낼 수 있어요.");
  const user = await db.user.findUnique({ where: { id: me.id }, select: { email: true, emailVerifiedAt: true } });
  if (!user) return fail(messages.notFound);
  if (user.emailVerifiedAt) return ok(undefined, "이미 인증된 이메일이에요.");
  await sendVerificationMail(me.id, user.email, me.displayName);
  return ok(undefined, `${user.email}로 인증 메일을 보냈어요.`);
}

export async function verifyEmail(token: string): Promise<ActionResult> {
  const userId = await consumeAuthToken(String(token), "EMAIL_VERIFY");
  if (!userId) return fail("링크가 만료되었거나 이미 사용되었어요. 설정에서 인증 메일을 다시 받아 주세요.");
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return ok(undefined, "이메일 인증이 끝났어요!");
}

/**
 * 비밀번호 재설정 메일 요청.
 * 가입 여부를 알 수 없도록 항상 같은 응답을 준다(계정 열거 방지).
 */
export async function requestPasswordReset(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return fail("올바른 이메일을 입력해 주세요.", { email: "올바른 이메일을 입력해 주세요." });
  const email = parsed.data;
  const [ipOk, emailOk] = await Promise.all([checkLimit("signup", `reset-ip:${await clientIp()}`), rateLimit(`reset:${email}`, 3, 60 * 60)]);
  const done = ok(undefined, "가입된 이메일이라면 비밀번호 재설정 링크를 보냈어요. 메일함을 확인해 주세요.");
  if (!ipOk || !emailOk) return done;

  const user = await db.user.findUnique({ where: { email }, select: { id: true, status: true, profile: { select: { displayName: true } } } });
  if (user && user.status === "ACTIVE") {
    const token = await issueAuthToken(user.id, "PASSWORD_RESET");
    await sendMail({
      to: email,
      subject: `[${brand.name}] 비밀번호 재설정 안내`,
      text: `${user.profile?.displayName ?? ""}님, 비밀번호 재설정을 요청하셨어요.\n\n아래 링크에서 새 비밀번호를 정해 주세요. (1시간 동안 유효)\n${appUrl(`/reset-password?token=${token}`)}\n\n요청하지 않았다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.`,
    });
  }
  return done;
}

const resetSchema = z.object({ token: z.string().min(10).max(100), password: passwordSchema });

/** 새 비밀번호 저장 + 모든 기기에서 로그아웃 */
export async function resetPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({ token: formData.get("token"), password: formData.get("password") });
  if (!parsed.success) return fromZodError(parsed.error);
  const userId = await consumeAuthToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) return fail("링크가 만료되었거나 이미 사용되었어요. 비밀번호 찾기를 다시 해 주세요.");
  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
  return ok(undefined, "새 비밀번호로 바꿨어요. 다시 로그인해 주세요.");
}

const changeSchema = z.object({ current: z.string().min(1, "현재 비밀번호를 입력해 주세요.").max(128), next: passwordSchema });

/** 설정에서 비밀번호 변경: 현재 비밀번호 확인 후, 다른 기기는 로그아웃 */
export async function changePassword(input: z.input<typeof changeSchema>): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkLimit("login", `pwchange:${me.id}`))) return fail(messages.rateLimited);
  const user = await db.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
  if (!user || !(await verifyPassword(parsed.data.current, user.passwordHash))) return fail("현재 비밀번호가 맞지 않아요.", { current: "현재 비밀번호가 맞지 않아요." });
  if (parsed.data.current === parsed.data.next) return fail("지금과 다른 비밀번호를 써 주세요.", { next: "지금과 다른 비밀번호를 써 주세요." });
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  await revokeOtherSessions(me.id);
  return ok(undefined, "비밀번호를 바꿨어요. 다른 기기에서는 로그아웃됐어요.");
}
