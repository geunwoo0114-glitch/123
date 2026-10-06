import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getWallet } from "@/features/town/service";
import { brand } from "@/config/brand";
import { MobileTopBar } from "@/components/shell/nav";
import { TownTabs } from "@/components/town/town-tabs";

export const metadata = { title: brand.townName };

export default async function TownLayout({ children }: { children: React.ReactNode }) {
  const me = await requireOnboardedUser("/town");
  const wallet = await getWallet(me.id);
  return (
    <div className="min-h-dvh">
      <MobileTopBar title={brand.townName} />
      <div className="mx-auto max-w-4xl px-4 pt-5 pb-10 lg:pt-8">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="hidden text-display font-bold lg:block">{brand.townName}</h1>
            <p className="text-caption text-fg-muted">게임으로 {brand.currency.name}을 모으고, 미니미를 꾸며요. 모든 게임은 무료예요.</p>
          </div>
          <Link href="/town" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 shadow-1" aria-label={`보유 ${brand.currency.name} ${wallet.coins}개`}>
            <span className="text-[20px]" aria-hidden>
              {brand.currency.emoji}
            </span>
            <span className="text-title font-bold tabular-nums">{wallet.coins.toLocaleString()}</span>
          </Link>
        </header>
        <TownTabs />
        <div className="pt-5">{children}</div>
      </div>
    </div>
  );
}
