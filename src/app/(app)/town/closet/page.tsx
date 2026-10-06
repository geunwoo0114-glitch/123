import { requireOnboardedUser } from "@/lib/auth/guards";
import { getClosetState, recentGifts } from "@/features/town/queries";
import { relativeTime } from "@/lib/dates";
import { Avatar } from "@/components/ui/avatar";
import { ClosetEditor } from "@/components/town/closet-editor";

export const metadata = { title: "옷장" };

export default async function ClosetPage() {
  const me = await requireOnboardedUser("/town/closet");
  const [state, gifts] = await Promise.all([getClosetState(me.id), recentGifts(me.id)]);
  return (
    <>
      {gifts.length > 0 && (
        <section aria-label="받은 선물" className="space-card mb-5 p-4">
          <h2 className="mb-2 text-title font-bold">받은 선물 🎁</h2>
          <ul className="flex flex-col gap-2">
            {gifts.map((g) => (
              <li key={g.id} className="flex items-center gap-3 text-caption">
                <Avatar name={g.sender.displayName} avatarKey={g.sender.avatarKey} minimi={g.sender.minimi} size="sm" />
                <span className="min-w-0 flex-1">
                  <b>{g.sender.displayName}</b>님이 <b>{g.itemName}</b>을(를) 보냈어요{g.message && <span className="text-fg-muted"> · &ldquo;{g.message}&rdquo;</span>}
                </span>
                <span className="shrink-0 text-label text-fg-subtle">{relativeTime(g.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ClosetEditor initial={state.avatar} owned={state.owned} name={state.displayName} />
    </>
  );
}
