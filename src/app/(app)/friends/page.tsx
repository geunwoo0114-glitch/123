import { requireOnboardedUser } from "@/lib/auth/guards";
import { listFriendRequests, listFriends, suggestFriends } from "@/features/relationships/queries";
import { MobileTopBar } from "@/components/shell/nav";
import { EmptyState, SectionHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { FriendsManager, RequestList } from "@/components/home/friends-manager";
import { SuggestionList } from "@/components/home/suggestions";
import { Users } from "lucide-react";

export const metadata = { title: "친구" };

export default async function FriendsPage() {
  const me = await requireOnboardedUser("/friends");
  const [friends, requests, suggestions] = await Promise.all([listFriends(me.id), listFriendRequests(me.id), suggestFriends(me.id, 6)]);
  return (
    <>
      <MobileTopBar title="친구" />
      <div className="mx-auto max-w-[640px] px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-4 hidden text-display font-bold lg:block">친구</h1>
        {requests.incoming.length > 0 && (
          <section className="mb-6">
            <SectionHeader title={`받은 친구 신청 ${requests.incoming.length}`} />
            <RequestList requests={requests.incoming.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
          </section>
        )}
        <section className="mb-6">
          <SectionHeader title={`내 친구 ${friends.length}`} description="별표는 친한 친구예요. '친한 친구' 공개 글은 이 사람들만 볼 수 있어요." />
          {friends.length > 0 ? (
            <FriendsManager friends={friends.map((f) => ({ ...f, since: f.since?.toISOString() ?? null }))} />
          ) : (
            <div className="space-card">
              <EmptyState icon={<Users />} title="새로운 친구를 찾아보세요" description="아이디나 이름으로 검색하거나, 내 공간 링크를 친구에게 보내 보세요." action={<ButtonLink href="/explore">친구 찾기</ButtonLink>} />
            </div>
          )}
        </section>
        {requests.outgoing.length > 0 && (
          <section className="mb-6">
            <SectionHeader title={`보낸 신청 ${requests.outgoing.length}`} />
            <RequestList requests={requests.outgoing.map((r) => ({ ...r, message: null, label: null, createdAt: r.createdAt.toISOString() }))} outgoing />
          </section>
        )}
        {suggestions.length > 0 && (
          <section>
            <SectionHeader title="알 수도 있는 사람" />
            <div className="space-card px-4 py-1">
              <SuggestionList users={suggestions} />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
