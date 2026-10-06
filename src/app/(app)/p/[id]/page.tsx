import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getPostForViewer, listComments } from "@/features/posts/queries";
import { getBlockedIds } from "@/features/relationships/queries";
import { MobileTopBar } from "@/components/shell/nav";
import { PostCard } from "@/components/content/post-card";
import { CommentSection } from "@/components/content/comment-section";

export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const post = await getPostForViewer(id, viewer?.id ?? null);
  if (!post) return { title: "소식을 찾을 수 없어요", robots: { index: false } };
  const title = `${post.author.displayName}의 소식`;
  const description = post.body.slice(0, 120) || `${post.author.displayName}님이 사진을 올렸어요.`;
  return {
    title,
    description,
    openGraph: { title, description, images: post.images[0] ? [`/media/${post.images[0].key}`] : undefined, type: "article" },
    robots: post.visibility === "PUBLIC" ? undefined : { index: false },
  };
}

export default async function PostPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const post = await getPostForViewer(id, viewer?.id ?? null);
  if (!post) notFound();
  const blocked = viewer ? await getBlockedIds(viewer.id) : [];
  const comments = await listComments(post.id, post.author.id, viewer?.id ?? null, blocked);
  const authorTheme = await db.spaceSettings.findUnique({ where: { userId: post.author.id }, select: { themeId: true } });
  return (
    <>
      <MobileTopBar title="소식" />
      <div className="mx-auto max-w-[600px] px-4 pt-4 pb-10 lg:pt-8" data-theme-id={authorTheme?.themeId}>
        <PostCard post={post} viewerId={viewer?.id ?? null} />
        <CommentSection postId={post.id} comments={comments} viewerId={viewer?.id ?? null} />
      </div>
    </>
  );
}
