import { notFound } from "next/navigation";
import { NotebookPen, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { serviceDay } from "@/lib/dates";
import { getSpace } from "@/features/space/queries";
import { listDiaryByMonth, searchDiary } from "@/features/diary/queries";
import { promptForDay } from "@/features/diary/schemas";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { DiaryCalendar } from "@/components/space/diary-calendar";
import { DiaryItem } from "@/components/space/widgets";

export default async function DiaryPage({ params, searchParams }: PageProps<"/u/[username]/diary">) {
  const { username } = await params;
  const sp = await searchParams;
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space) notFound();
  if (!space.canView) return null;
  const isOwner = space.relation.state === "SELF";
  const today = serviceDay();
  const month = typeof sp.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const q = typeof sp.q === "string" ? sp.q.slice(0, 50) : "";
  const base = `/@${space.owner.username}/diary`;

  const entries = q ? await searchDiary(space.owner.id, viewer?.id ?? null, q) : await listDiaryByMonth(space.owner.id, viewer?.id ?? null, month);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="order-2 flex flex-col gap-3 xl:order-1">
        <form action={base} className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-subtle" />
          <input name="q" defaultValue={q} placeholder="일기 검색 (제목, 내용, #태그)" aria-label="일기 검색" className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 outline-none focus:border-fg-muted" />
        </form>
        {isOwner && !q && (
          <div className="space-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-label font-semibold text-accent">오늘의 질문</p>
              <p className="font-medium">{promptForDay(today)}</p>
            </div>
            <ButtonLink href="/write/diary" variant="accent" icon={<NotebookPen className="size-4" />}>
              오늘 일기 쓰기
            </ButtonLink>
          </div>
        )}
        <div className="space-card p-2">
          {entries.length > 0 ? (
            entries.map((e) => <DiaryItem key={e.id} entry={e} href={`${base}/${e.id}`} />)
          ) : (
            <EmptyState
              icon={<NotebookPen />}
              title={q ? `"${q}"에 해당하는 일기가 없어요` : "이 달에는 일기가 없어요"}
              description={isOwner ? "하루 한 줄이라도 괜찮아요. 쌓이면 추억이 돼요." : undefined}
            />
          )}
        </div>
      </div>
      <div className="order-1 xl:order-2">
        <DiaryCalendar month={month} days={q ? [] : entries.map((e) => e.date)} base={base} today={today} />
      </div>
    </div>
  );
}
