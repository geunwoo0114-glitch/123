import "server-only";
import { db } from "@/lib/db";
import { dateToDay, dayToDate } from "@/lib/dates";
import { mediaSelect, type MediaDTO } from "@/features/media/service";
import { canViewContent, visibleLevels, type Visibility } from "@/features/privacy/policy";
import { getRelation } from "@/features/relationships/queries";

export type DiaryDTO = {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: string | null;
  weather: string | null;
  place: string | null;
  tags: string[];
  visibility: Visibility;
  createdAt: string;
  images: MediaDTO[];
};

const diarySelect = {
  id: true,
  authorId: true,
  date: true,
  title: true,
  body: true,
  mood: true,
  weather: true,
  place: true,
  tags: true,
  visibility: true,
  createdAt: true,
  images: { orderBy: { order: "asc" as const }, select: { media: { select: mediaSelect } } },
};

function toDTO(d: {
  id: string;
  date: Date;
  title: string;
  body: string;
  mood: string | null;
  weather: string | null;
  place: string | null;
  tags: string[];
  visibility: Visibility;
  createdAt: Date;
  images: { media: MediaDTO }[];
}): DiaryDTO {
  return { ...d, date: dateToDay(d.date), createdAt: d.createdAt.toISOString(), images: d.images.map((i) => i.media) };
}

/** 월별 목록. month = YYYY-MM */
export async function listDiaryByMonth(ownerId: string, viewerId: string | null, month: string) {
  const rel = await getRelation(viewerId, ownerId);
  const levels = visibleLevels(rel);
  const [y, m] = month.split("-").map(Number);
  const start = dayToDate(`${y}-${String(m).padStart(2, "0")}-01`);
  const end = new Date(Date.UTC(y, m, 1));
  const rows = await db.diaryEntry.findMany({
    where: { authorId: ownerId, deletedAt: null, visibility: { in: levels }, date: { gte: start, lt: end } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: diarySelect,
  });
  return rows.map(toDTO);
}

export async function listRecentDiary(ownerId: string, viewerId: string | null, take = 3) {
  const rel = await getRelation(viewerId, ownerId);
  const rows = await db.diaryEntry.findMany({
    where: { authorId: ownerId, deletedAt: null, visibility: { in: visibleLevels(rel) } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    select: diarySelect,
  });
  return rows.map(toDTO);
}

export async function searchDiary(ownerId: string, viewerId: string | null, q: string) {
  const rel = await getRelation(viewerId, ownerId);
  const term = q.trim().slice(0, 50);
  if (!term) return [];
  const rows = await db.diaryEntry.findMany({
    where: {
      authorId: ownerId,
      deletedAt: null,
      visibility: { in: visibleLevels(rel) },
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { body: { contains: term, mode: "insensitive" } },
        { tags: { has: term.replace(/^#/, "").toLowerCase() } },
      ],
    },
    orderBy: { date: "desc" },
    take: 50,
    select: diarySelect,
  });
  return rows.map(toDTO);
}

/** 이 달에 일기가 있는 날짜 (캘린더 점 표시) */
export async function diaryDaysInMonth(ownerId: string, viewerId: string | null, month: string): Promise<string[]> {
  const entries = await listDiaryByMonth(ownerId, viewerId, month);
  return [...new Set(entries.map((e) => e.date))];
}

/** 지난 해 같은 날의 기록 (본인만) */
export async function onThisDay(ownerId: string, today: string) {
  const [, mm, dd] = today.split("-");
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "DiaryEntry"
    WHERE "authorId" = ${ownerId} AND "deletedAt" IS NULL
      AND to_char("date", 'MM-DD') = ${`${mm}-${dd}`}
      AND "date" < ${dayToDate(today)}
    ORDER BY "date" DESC LIMIT 5`;
  if (rows.length === 0) return [];
  const entries = await db.diaryEntry.findMany({ where: { id: { in: rows.map((r) => r.id) } }, orderBy: { date: "desc" }, select: diarySelect });
  return entries.map(toDTO);
}

export async function getDiaryForViewer(id: string, viewerId: string | null) {
  const d = await db.diaryEntry.findFirst({ where: { id, deletedAt: null, author: { status: "ACTIVE" } }, select: diarySelect });
  if (!d) return null;
  const rel = await getRelation(viewerId, d.authorId);
  if (!canViewContent(rel, d.visibility)) return null;
  return { ...toDTO(d), authorId: d.authorId };
}
