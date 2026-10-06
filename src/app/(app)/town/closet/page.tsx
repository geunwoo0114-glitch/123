import { requireOnboardedUser } from "@/lib/auth/guards";
import { getClosetState } from "@/features/town/queries";
import { ClosetEditor } from "@/components/town/closet-editor";

export const metadata = { title: "옷장" };

export default async function ClosetPage() {
  const me = await requireOnboardedUser("/town/closet");
  const state = await getClosetState(me.id);
  return <ClosetEditor initial={state.avatar} owned={state.owned} name={state.displayName} />;
}
