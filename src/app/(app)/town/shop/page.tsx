import { requireOnboardedUser } from "@/lib/auth/guards";
import { getClosetState } from "@/features/town/queries";
import { ShopView } from "@/components/town/shop-view";

export const metadata = { title: "미니미 상점" };

export default async function ShopPage() {
  const me = await requireOnboardedUser("/town/shop");
  const state = await getClosetState(me.id);
  return <ShopView avatar={state.avatar} owned={state.owned} coins={state.coins} name={state.displayName} />;
}
