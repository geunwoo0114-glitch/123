import { requireOnboardedUser } from "@/lib/auth/guards";
import { serviceDay } from "@/lib/dates";
import { promptForDay } from "@/features/diary/schemas";
import { PostComposer } from "@/components/content/post-composer";
import { MobileTopBar } from "@/components/shell/nav";

export const metadata = { title: "소식 남기기" };

export default async function WritePage() {
  const me = await requireOnboardedUser("/write");
  return (
    <>
      <MobileTopBar title="소식 남기기" />
      <div className="mx-auto max-w-[600px] px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-4 hidden text-heading font-bold lg:block">소식 남기기</h1>
        <div className="space-card p-4 sm:p-6">
          <PostComposer redirectTo={`/@${me.username}`} placeholder={`오늘의 질문: ${promptForDay(serviceDay())}`} />
        </div>
      </div>
    </>
  );
}
