"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, fromZodError, messages, ok, type ActionResult } from "@/lib/action";
import { appConfig } from "@/config/app";
import { avatarSchema } from "@/features/avatar/schema";
import { missingItems } from "@/features/town/catalog";
import { ownedItemIds } from "@/features/town/service";
import { ownedMediaIds } from "@/features/media/service";
import { profileSchema, usernameSchema } from "@/features/users/schemas";
import { visibilitySchema } from "@/features/posts/schemas";
import { track } from "@/features/analytics/track";
import { backgroundIds, cardStyleIds, layoutIds, spaceWidgets, themeIds } from "./themes";
import { parseMusicUrl } from "./music";

function revalidateMe(username: string) {
  revalidatePath("/", "layout");
  revalidatePath(`/u/${username}`, "layout");
}

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { avatarMediaId, coverMediaId, interests, statusMessage, ...rest } = parsed.data;
  const mediaToCheck = [avatarMediaId, coverMediaId].filter((x): x is string => !!x);
  if ((await ownedMediaIds(me.id, mediaToCheck)) === null) return fail("사진을 다시 올려 주세요.");

  const current = await db.profile.findUnique({ where: { userId: me.id }, select: { statusMessage: true, statusEmoji: true } });
  const statusChanged = current?.statusMessage !== statusMessage || current?.statusEmoji !== rest.statusEmoji;
  await db.profile.update({
    where: { userId: me.id },
    data: {
      ...rest,
      statusMessage,
      interests: [...new Set(interests)],
      ...(avatarMediaId !== undefined ? { avatarMediaId } : {}),
      ...(coverMediaId !== undefined ? { coverMediaId } : {}),
      ...(statusChanged ? { statusUpdatedAt: statusMessage ? new Date() : null } : {}),
    },
  });
  track("profile_updated", me.id);
  revalidateMe(me.username);
  return ok(undefined, "프로필을 저장했어요.");
}

/** 상태 메시지만 빠르게 변경 (홈/공간에서 인라인 편집) */
export async function updateStatus(input: { statusMessage: string; statusEmoji: string }): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = z
    .object({
      statusMessage: z.string().trim().max(appConfig.limits.statusMessage, `${appConfig.limits.statusMessage}자까지 쓸 수 있어요.`),
      statusEmoji: z.string().trim().max(8),
    })
    .safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  await db.profile.update({
    where: { userId: me.id },
    data: { ...parsed.data, statusUpdatedAt: parsed.data.statusMessage ? new Date() : null },
  });
  revalidateMe(me.username);
  return ok(undefined, parsed.data.statusMessage ? "상태를 바꿨어요." : "상태를 비웠어요.");
}

const spaceSchema = z.object({
  themeId: z.enum(themeIds),
  backgroundId: z.enum(backgroundIds),
  layoutVariant: z.enum(layoutIds),
  cardStyle: z.enum(cardStyleIds),
  widgets: z
    .array(z.object({ id: z.enum(spaceWidgets.map((w) => w.id) as [string, ...string[]]), visible: z.boolean() }))
    .max(spaceWidgets.length),
  musicUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || parseMusicUrl(v) !== null, "Spotify 또는 YouTube 링크만 쓸 수 있어요."),
  musicTitle: z.string().trim().max(60).optional().transform((v) => v || null),
  musicArtist: z.string().trim().max(60).optional().transform((v) => v || null),
});

export async function updateSpace(input: z.input<typeof spaceSchema>): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = spaceSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  await db.spaceSettings.upsert({ where: { userId: me.id }, create: { userId: me.id, ...parsed.data }, update: parsed.data });
  track("space_customized", me.id, { themeId: parsed.data.themeId });
  revalidateMe(me.username);
  return ok(undefined, "공간을 새로 꾸몄어요.");
}

const privacySchema = z.object({
  spaceVisibility: visibilitySchema.exclude(["CLOSE_FRIENDS"]),
  guestbookPolicy: z.enum(["EVERYONE", "FRIENDS", "NOBODY"]),
  messagePolicy: z.enum(["EVERYONE", "FRIENDS", "NOBODY"]),
  leaveVisitTraces: z.boolean(),
  showVisitorsPublic: z.boolean(),
  discoverable: z.boolean(),
  allowFriendRequests: z.boolean(),
  notifyLikes: z.boolean(),
  notifyComments: z.boolean(),
  notifyGuestbook: z.boolean(),
  notifyFollows: z.boolean(),
});

export async function updatePrivacy(input: z.input<typeof privacySchema>): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = privacySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  await db.userSettings.upsert({ where: { userId: me.id }, create: { userId: me.id, ...parsed.data }, update: parsed.data });
  revalidateMe(me.username);
  return ok(undefined, "설정을 저장했어요.");
}

export async function changeUsername(input: { username: string }): Promise<ActionResult<{ username: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = usernameSchema.safeParse(input.username);
  if (!parsed.success) return fromZodError(parsed.error);
  const username = parsed.data;
  if (username === me.username) return ok({ username });
  const user = await db.user.findUnique({ where: { id: me.id }, select: { usernameChangedAt: true } });
  const cooldown = appConfig.username.changeCooldownDays * 24 * 3600 * 1000;
  if (user?.usernameChangedAt && Date.now() - user.usernameChangedAt.getTime() < cooldown) {
    return fail(`아이디는 ${appConfig.username.changeCooldownDays}일에 한 번만 바꿀 수 있어요.`);
  }
  try {
    await db.user.update({ where: { id: me.id }, data: { username, usernameChangedAt: new Date() } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("이미 사용 중인 아이디예요.", { username: "이미 사용 중인 아이디예요." });
    throw e;
  }
  revalidateMe(username);
  return ok({ username }, "아이디를 바꿨어요.");
}

const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(appConfig.limits.displayName),
  statusMessage: z.string().trim().max(appConfig.limits.statusMessage).default(""),
  statusEmoji: z.string().trim().max(8).default(""),
  interests: z.array(z.string().trim().min(1).max(16)).max(appConfig.limits.interests).default([]),
  avatar: avatarSchema,
  themeId: z.enum(themeIds),
});

export async function completeOnboarding(input: z.input<typeof onboardingSchema>): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { avatar, themeId, statusMessage, ...profile } = parsed.data;
  if (missingItems(avatar, await ownedItemIds(me.id)).length) return fail("아직 갖고 있지 않은 아이템이 있어요.");
  await db.$transaction([
    db.profile.update({
      where: { userId: me.id },
      data: { ...profile, statusMessage, avatar, interests: [...new Set(profile.interests)], statusUpdatedAt: statusMessage ? new Date() : null },
    }),
    db.spaceSettings.upsert({ where: { userId: me.id }, create: { userId: me.id, themeId }, update: { themeId } }),
    db.user.update({ where: { id: me.id }, data: { onboardedAt: new Date() } }),
  ]);
  track("onboarding_completed", me.id);
  revalidateMe(me.username);
  return ok();
}
