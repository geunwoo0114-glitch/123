import { requireOnboardedUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { normalizeWidgets } from "@/features/space/themes";
import { SpaceForm } from "@/components/settings/space-form";

export default async function SpaceSettingsPage() {
  const me = await requireOnboardedUser("/settings/space");
  const s = await db.spaceSettings.findUnique({ where: { userId: me.id } });
  return (
    <SpaceForm
      username={me.username}
      initial={{
        themeId: s?.themeId ?? "peach",
        backgroundId: s?.backgroundId ?? "paper",
        layoutVariant: s?.layoutVariant ?? "classic",
        cardStyle: s?.cardStyle ?? "soft",
        widgets: normalizeWidgets(s?.widgets),
        musicUrl: s?.musicUrl ?? "",
        musicTitle: s?.musicTitle ?? "",
        musicArtist: s?.musicArtist ?? "",
      }}
    />
  );
}
