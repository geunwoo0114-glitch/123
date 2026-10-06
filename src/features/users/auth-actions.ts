"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, getDummyHash } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/guards";
import { checkLimit, clientIp } from "@/lib/rate-limit";
import { fail, fromZodError, messages, type ActionResult } from "@/lib/action";
import { randomAvatar } from "@/features/avatar/schema";
import { isFreeItem } from "@/features/town/catalog";
import { economy } from "@/features/town/games";
import { defaultWidgets } from "@/features/space/themes";
import { track } from "@/features/analytics/track";
import { loginSchema, signupSchema } from "./schemas";

export type AuthFormState = ActionResult | null;

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkLimit("signup", await clientIp()))) return fail(messages.rateLimited);
  const { email, username, displayName, password } = parsed.data;

  const passwordHash = await hashPassword(password);
  let userId: string;
  try {
    const user = await db.user.create({
      data: {
        email,
        username,
        passwordHash,
        coins: economy.signupBonus,
        coinTransactions: { create: { amount: economy.signupBonus, reason: "SIGNUP_BONUS", refId: "signup" } },
        profile: { create: { displayName, avatar: randomAvatar(username, isFreeItem) } },
        space: { create: { widgets: defaultWidgets } },
        settings: { create: {} },
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String((e.meta?.target as string[] | undefined)?.join(",") ?? "");
      return target.includes("email")
        ? fail("이미 가입된 이메일이에요.", { email: "이미 가입된 이메일이에요." })
        : fail("이미 사용 중인 아이디예요.", { username: "이미 사용 중인 아이디예요." });
    }
    throw e;
  }
  await createSession(userId);
  track("signup", userId);
  redirect("/onboarding");
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { identifier, password } = parsed.data;

  const ip = await clientIp();
  // IP와 계정 양쪽으로 제한해 무차별 대입을 막는다
  const [ipOk, idOk] = await Promise.all([checkLimit("login", ip), checkLimit("login", `id:${identifier}`)]);
  if (!ipOk || !idOk) return fail("로그인 시도가 너무 많아요. 15분 후에 다시 시도해 주세요.");

  const user = await db.user.findFirst({
    where: identifier.includes("@") ? { email: identifier } : { username: identifier },
    select: { id: true, passwordHash: true, status: true, onboardedAt: true },
  });
  // 계정 존재 여부와 무관하게 비슷한 시간이 걸리도록 항상 해시 비교를 수행
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return fail("이메일(아이디) 또는 비밀번호가 맞지 않아요.");
  if (user.status !== "ACTIVE") return fail("이용이 제한된 계정이에요. 고객센터에 문의해 주세요.");

  await createSession(user.id);
  track("login", user.id);
  redirect(user.onboardedAt ? safeNext(formData.get("next")) : "/onboarding");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
