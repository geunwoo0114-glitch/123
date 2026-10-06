"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, messages, ok, type ActionResult } from "@/lib/action";

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  await db.notification.updateMany({ where: { recipientId: me.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
  return ok();
}
