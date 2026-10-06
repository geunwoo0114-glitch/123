import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSpace } from "@/features/space/queries";
import { listUserPosts } from "@/features/posts/queries";
import { UserPostsList } from "@/components/content/user-posts-list";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { PenLine } from "lucide-react";

export default async function SpacePosts({ params }: PageProps<"/u/[username]/posts">) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space) notFound();
  if (!space.canView) return null;
  const isOwner = space.relation.state === "SELF";
  const page = await listUserPosts(space.owner.id, viewer?.id ?? null);
  if (page.items.length === 0) {
    return (
      <div className="space-card">
        <EmptyState icon={<PenLine />} title="아직 소식이 없어요" description={isOwner ? "요즘 어떻게 지내는지 남겨보세요." : undefined} action={isOwner ? <ButtonLink href="/write">소식 남기기</ButtonLink> : undefined} />
      </div>
    );
  }
  return <UserPostsList ownerId={space.owner.id} initial={page.items} nextCursor={page.nextCursor} viewerId={viewer?.id ?? null} pinnedId={null} isOwner={isOwner} />;
}
