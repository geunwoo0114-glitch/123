import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { serviceDay } from "@/lib/dates";
import { promptForDay } from "@/features/diary/schemas";
import { getDiaryForViewer } from "@/features/diary/queries";
import { DiaryEditor } from "@/components/content/diary-editor";
import { MobileTopBar } from "@/components/shell/nav";

export const metadata = { title: "다이어리 쓰기" };

export default async function WriteDiaryPage({ searchParams }: PageProps<"/write/diary">) {
  const me = await requireOnboardedUser("/write/diary");
  const { id } = await searchParams;
  const existing = typeof id === "string" ? await getDiaryForViewer(id, me.id) : null;
  if (typeof id === "string" && (!existing || existing.authorId !== me.id)) notFound();
  const today = serviceDay();
  return (
    <>
      <MobileTopBar title={existing ? "일기 고치기" : "다이어리 쓰기"} />
      <div className="mx-auto max-w-[680px] px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-4 hidden text-heading font-bold lg:block">{existing ? "일기 고치기" : "오늘의 다이어리"}</h1>
        <DiaryEditor username={me.username} today={today} prompt={promptForDay(today)} initial={existing ?? undefined} />
      </div>
    </>
  );
}
