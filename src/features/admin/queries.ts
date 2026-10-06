import "server-only";
import type { ReportTarget } from "@prisma/client";
import { db } from "@/lib/db";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";
import { reportReasons } from "@/features/reports/reasons";

export type ReportGroup = {
  targetType: ReportTarget;
  targetId: string;
  count: number;
  latestAt: string;
  reasons: { label: string; n: number }[];
  details: string[];
  preview: { text: string; owner: UserCard | null; href: string | null; removed: boolean; thumbKey?: string | null };
};

const reasonLabel = (id: string) => reportReasons.find((r) => r.id === id)?.label ?? id;

/** 신고 대상의 내용 미리보기 + 주인 */
async function resolvePreview(type: ReportTarget, id: string): Promise<ReportGroup["preview"]> {
  switch (type) {
    case "USER": {
      const u = await db.user.findUnique({ where: { id }, select: { ...userCardSelect, status: true } });
      return { text: u ? `@${u.username} (${u.status})` : "삭제된 사용자", owner: u ? toUserCard(u) : null, href: u ? `/@${u.username}` : null, removed: !u || u.status !== "ACTIVE" };
    }
    case "POST": {
      const p = await db.post.findUnique({ where: { id }, select: { body: true, deletedAt: true, author: { select: userCardSelect } } });
      return { text: p?.body || "(사진만 있는 글)", owner: p ? toUserCard(p.author) : null, href: `/p/${id}`, removed: !p || !!p.deletedAt };
    }
    case "COMMENT": {
      const c = await db.comment.findUnique({ where: { id }, select: { body: true, postId: true, deletedAt: true, author: { select: userCardSelect } } });
      return { text: c?.body ?? "삭제된 댓글", owner: c ? toUserCard(c.author) : null, href: c ? `/p/${c.postId}` : null, removed: !c || !!c.deletedAt };
    }
    case "GUESTBOOK": {
      const g = await db.guestbookEntry.findUnique({ where: { id }, select: { body: true, deletedAt: true, author: { select: userCardSelect }, host: { select: { username: true } } } });
      return { text: g?.body ?? "삭제된 방명록", owner: g ? toUserCard(g.author) : null, href: g ? `/@${g.host.username}/guestbook` : null, removed: !g || !!g.deletedAt };
    }
    case "DIARY": {
      const d = await db.diaryEntry.findUnique({ where: { id }, select: { title: true, body: true, deletedAt: true, author: { select: userCardSelect } } });
      return { text: d ? `${d.title} — ${d.body.slice(0, 120)}` : "삭제된 일기", owner: d ? toUserCard(d.author) : null, href: d ? `/@${d.author.username}/diary/${id}` : null, removed: !d || !!d.deletedAt };
    }
    case "PHOTO": {
      const ph = await db.photo.findUnique({ where: { id }, select: { caption: true, media: { select: { thumbKey: true } }, album: { select: { id: true, owner: { select: userCardSelect } } } } });
      return {
        text: ph?.caption || "(사진)",
        owner: ph ? toUserCard(ph.album.owner) : null,
        href: ph ? `/@${ph.album.owner.username}/photos/${ph.album.id}` : null,
        removed: !ph,
        thumbKey: ph?.media.thumbKey ?? null,
      };
    }
  }
}

/** 신고를 대상별로 묶어서 (누적 신고가 많은 순 → 최신 순) */
export async function listReportGroups(open: boolean, take = 30): Promise<ReportGroup[]> {
  const statuses = open ? (["OPEN", "REVIEWING"] as const) : (["RESOLVED", "DISMISSED"] as const);
  const rows = await db.report.findMany({
    where: { status: { in: [...statuses] } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { targetType: true, targetId: true, reason: true, detail: true, createdAt: true },
  });
  const groups = new Map<string, { targetType: ReportTarget; targetId: string; rows: typeof rows }>();
  for (const r of rows) {
    const key = `${r.targetType}:${r.targetId}`;
    if (!groups.has(key)) groups.set(key, { targetType: r.targetType, targetId: r.targetId, rows: [] });
    groups.get(key)!.rows.push(r);
  }
  const sorted = [...groups.values()].sort((a, b) => b.rows.length - a.rows.length || (b.rows[0].createdAt > a.rows[0].createdAt ? 1 : -1)).slice(0, take);
  return Promise.all(
    sorted.map(async (g) => {
      const reasonCount = new Map<string, number>();
      for (const r of g.rows) reasonCount.set(r.reason, (reasonCount.get(r.reason) ?? 0) + 1);
      return {
        targetType: g.targetType,
        targetId: g.targetId,
        count: g.rows.length,
        latestAt: g.rows[0].createdAt.toISOString(),
        reasons: [...reasonCount.entries()].map(([id, n]) => ({ label: reasonLabel(id), n })),
        details: g.rows.map((r) => r.detail).filter(Boolean).slice(0, 5),
        preview: await resolvePreview(g.targetType, g.targetId),
      };
    }),
  );
}

export async function countOpenReports() {
  return db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } });
}

export async function listSuspendedUsers() {
  const rows = await db.user.findMany({ where: { status: "SUSPENDED" }, orderBy: { updatedAt: "desc" }, take: 100, select: userCardSelect });
  return rows.map(toUserCard);
}

export async function recentModerationActions(take = 30) {
  const rows = await db.moderationAction.findMany({ orderBy: { createdAt: "desc" }, take, include: { admin: { select: { username: true } } } });
  return rows.map((r) => ({ id: r.id, action: r.action, targetType: r.targetType, targetId: r.targetId, note: r.note, admin: r.admin.username, createdAt: r.createdAt.toISOString() }));
}
