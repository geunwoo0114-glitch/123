import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { popularTags, recentPublicPosts, searchPublicPosts, searchUsers } from "@/features/search/queries";
import { suggestFriends } from "@/features/relationships/queries";
import { MobileTopBar } from "@/components/shell/nav";
import { EmptyState, SectionHeader } from "@/components/ui/misc";
import { UserLink } from "@/components/user/user-link";
import { PostCard } from "@/components/content/post-card";
import { SuggestionList } from "@/components/home/suggestions";

export const metadata = { title: "둘러보기" };

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 40) : "";
  const viewer = await getCurrentUser();
  const viewerId = viewer?.id ?? null;

  const [users, posts, tags, suggestions] = await Promise.all([
    q && !q.startsWith("#") ? searchUsers(q, viewerId) : Promise.resolve([]),
    q ? searchPublicPosts(q, viewerId) : recentPublicPosts(viewerId, 12),
    q ? Promise.resolve([]) : popularTags(10),
    !q && viewerId ? suggestFriends(viewerId, 8) : Promise.resolve([]),
  ]);

  return (
    <>
      <MobileTopBar title="둘러보기" />
      <div className="mx-auto max-w-[640px] px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-4 hidden text-display font-bold lg:block">둘러보기</h1>
        <form action="/explore" role="search" className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-fg-subtle" />
          <input
            name="q"
            defaultValue={q}
            placeholder="이름, @아이디, #태그로 찾기"
            aria-label="검색"
            autoComplete="off"
            className="h-12 w-full rounded-full border border-line bg-surface pr-4 pl-12 text-body shadow-1 outline-none focus:border-fg-muted"
          />
        </form>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link key={t} href={`/explore?q=${encodeURIComponent(`#${t}`)}`} className="rounded-full bg-surface px-3 py-1 text-caption text-fg-muted shadow-1 hover:text-fg">
                #{t}
              </Link>
            ))}
          </div>
        )}

        {q && !q.startsWith("#") && (
          <section className="mt-6">
            <SectionHeader title="사람" />
            {users.length > 0 ? (
              <ul className="space-card divide-y divide-line">
                {users.map((u) => (
                  <li key={u.id} className="px-4 py-3">
                    <UserLink user={u} showStatus />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="space-card px-4 py-6 text-center text-caption text-fg-muted">&ldquo;{q}&rdquo;에 맞는 사람이 없어요. 아이디를 정확히 입력해 보세요.</p>
            )}
          </section>
        )}

        {suggestions.length > 0 && (
          <section className="mt-6">
            <SectionHeader title="알 수도 있는 사람" description="함께 아는 친구, 같은 관심사, 새로 온 이웃" />
            <div className="space-card px-4 py-1">
              <SuggestionList users={suggestions} />
            </div>
          </section>
        )}

        <section className="mt-6">
          <SectionHeader title={q ? "소식" : "지금 다락에서는"} />
          {posts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} viewerId={viewerId} />
              ))}
            </div>
          ) : (
            <div className="space-card">
              <EmptyState icon={<Search />} title={q ? "검색 결과가 없어요" : "아직 공개된 소식이 없어요"} description={q ? "다른 단어로 찾아보세요." : undefined} />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
