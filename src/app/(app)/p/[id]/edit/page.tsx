import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getPostForViewer } from "@/features/posts/queries";
import { PostComposer } from "@/components/content/post-composer";
import { MobileTopBar } from "@/components/shell/nav";

export const metadata = { title: "소식 수정" };

export default async function EditPostPage({ params }: PageProps<"/p/[id]/edit">) {
  const { id } = await params;
  const me = await requireOnboardedUser(`/p/${id}/edit`);
  const post = await getPostForViewer(id, me.id);
  if (!post || post.author.id !== me.id) notFound();
  return (
    <>
      <MobileTopBar title="소식 수정" />
      <div className="mx-auto max-w-[600px] px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-4 hidden text-heading font-bold lg:block">소식 수정</h1>
        <div className="space-card p-4 sm:p-6">
          <PostComposer redirectTo={`/p/${id}`} initial={{ id: post.id, body: post.body, mood: post.mood, visibility: post.visibility, linkUrl: post.linkUrl, images: post.images }} />
        </div>
      </div>
    </>
  );
}
