import { requireOnboardedUser } from "@/lib/auth/guards";
import { getClosetState } from "@/features/town/queries";
import { RoomEditor } from "@/components/town/room-editor";

export const metadata = { title: "미니룸 꾸미기" };

export default async function RoomPage() {
  const me = await requireOnboardedUser("/town/room");
  const state = await getClosetState(me.id);
  return <RoomEditor initial={state.room} owned={state.owned} minimi={state.avatar} name={state.displayName} themeId={state.themeId} username={me.username} />;
}
