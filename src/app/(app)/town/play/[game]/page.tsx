import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { gameIds, games, type GameId } from "@/features/town/games";
import { getWallet } from "@/features/town/service";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { MemoryGame } from "@/components/town/memory-game";
import { CatchGame } from "@/components/town/catch-game";

export default async function PlayPage({ params }: PageProps<"/town/play/[game]">) {
  const { game } = await params;
  if (!gameIds.includes(game as GameId)) notFound();
  const me = await requireOnboardedUser(`/town/play/${game}`);
  const wallet = await getWallet(me.id);
  const def = games[game as GameId];
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/town" className="mb-3 inline-flex items-center text-caption font-medium text-fg-muted hover:text-fg">
        <ChevronLeft className="size-4" /> 광장으로
      </Link>
      <h2 className="text-heading font-bold">
        {def.emoji} {def.name}
      </h2>
      <p className="mb-4 text-caption text-fg-muted">{def.description}</p>
      {wallet.gameCapRemaining === 0 && (
        <p className="mb-3 rounded-md bg-warning-soft px-3 py-2 text-caption text-warning">오늘 보상은 다 모았어요. 연습 삼아 즐겨보세요!</p>
      )}
      {game === "memory" ? <MemoryGame /> : <CatchGame />}
    </div>
  );
}
