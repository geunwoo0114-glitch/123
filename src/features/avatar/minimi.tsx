import { cn } from "@/lib/cn";
import { minimiBackgrounds, minimiUrl, type AvatarConfig } from "./schema";

/** 미니미 이미지 (서버/클라이언트 공용). SVG는 /minimi/[code]에서 렌더링되어 영구 캐시된다. */
export function Minimi({ config, title, className, withBg }: { config: AvatarConfig; title?: string; className?: string; withBg?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 정적 SVG, 최적화 불필요
    <img
      src={minimiUrl(config)}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={cn("select-none", className)}
      style={withBg ? { backgroundColor: minimiBackgrounds[config.bg] } : undefined}
    />
  );
}

export function minimiBg(config: AvatarConfig | null | undefined) {
  return config ? minimiBackgrounds[config.bg] : undefined;
}
