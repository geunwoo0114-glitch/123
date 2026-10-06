import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSpace } from "@/features/space/queries";
import { ownedItemIds } from "@/features/town/service";
import { HouseView } from "@/components/house/house-view";

export async function generateMetadata({ params }: PageProps<"/u/[username]/house">) {
  const { username } = await params;
  return { title: `@${username}의 2.5D 집` };
}

export default async function HousePage({ params, searchParams }: PageProps<"/u/[username]/house">) {
  const { username } = await params;
  // ?snapshot=1: 조작 버튼과 사람 없이 방만 (공유 이미지·포스터용)
  const snapshot = (await searchParams).snapshot === "1";
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space) notFound();
  if (!space.canView || space.relation.state === "BLOCKED") return null;
  const isOwner = space.relation.state === "SELF";

  const [owned, me] = isOwner
    ? await Promise.all([ownedItemIds(space.owner.id), db.user.findUnique({ where: { id: space.owner.id }, select: { coins: true } })])
    : [null, null];

  return (
    <HouseView
      key={JSON.stringify(space.house)}
      initial={space.house}
      owner={{ username: space.owner.username, displayName: space.owner.displayName, minimi: space.owner.minimi }}
      isOwner={isOwner}
      presence={!!viewer && !snapshot}
      snapshot={snapshot}
      owned={owned ? [...owned] : []}
      coins={me?.coins ?? 0}
    />
  );
}
