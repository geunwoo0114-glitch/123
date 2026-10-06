import { minimiUrl, type AvatarConfig } from "@/features/avatar/schema";

/**
 * 미니룸: 공간 주인이 자기 방에 앉아 있는 장면.
 * 지금은 테마 색만 반영하는 고정 장면이고, 향후 가구/벽지/바닥 아이템 배치(2D)와
 * 3D 공간(React Three Fiber)으로 교체될 자리다. 그 경우 이 컴포넌트만 바꾸면 된다.
 */
export function MiniRoom({ minimi, name, statusMessage }: { minimi: AvatarConfig | null; name: string; statusMessage?: string }) {
  return (
    <figure className="relative overflow-hidden rounded-lg" aria-label={`${name}의 미니룸`}>
      <svg viewBox="0 0 320 190" className="block h-auto w-full" role="img" aria-label={`${name}의 방`}>
        <defs>
          <pattern id="wallpaper" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="1.4" fill="var(--space-accent)" opacity="0.18" />
          </pattern>
        </defs>
        {/* 벽 */}
        <rect width="320" height="190" fill="var(--space-soft-current)" />
        <rect width="320" height="190" fill="url(#wallpaper)" />
        {/* 바닥 */}
        <path d="M0 140 L320 140 L320 190 L0 190 Z" fill="var(--space-accent)" opacity="0.22" />
        <path d="M0 140 L320 140" stroke="var(--space-accent)" strokeOpacity="0.35" strokeWidth="2" />
        {/* 창문 */}
        <rect x="28" y="26" width="72" height="58" rx="6" fill="#fff" />
        <rect x="33" y="31" width="62" height="48" rx="3" fill="#BFE0F5" />
        <circle cx="80" cy="44" r="7" fill="#FFE29A" />
        <path d="M33 70 Q50 58 64 68 T95 64 L95 79 L33 79 Z" fill="#9FD1A6" />
        <path d="M64 31 V79 M33 55 H95" stroke="#fff" strokeWidth="3" />
        {/* 선반 + 책 + 액자 */}
        <rect x="226" y="58" width="70" height="5" rx="2" fill="#B98B62" />
        <rect x="232" y="36" width="8" height="22" rx="1.5" fill="var(--space-accent)" />
        <rect x="242" y="40" width="7" height="18" rx="1.5" fill="#E3B23C" />
        <rect x="251" y="34" width="9" height="24" rx="1.5" fill="#5E8C6A" />
        <rect x="268" y="38" width="22" height="20" rx="2" fill="#fff" stroke="#B98B62" strokeWidth="2" />
        <path d="M272 54 L278 46 L282 51 L285 48 L287 54 Z" fill="var(--space-accent)" opacity="0.7" />
        {/* 화분 */}
        <path d="M24 150 L44 150 L41 176 L27 176 Z" fill="#C98A5E" />
        <path d="M34 150 C24 136 22 124 28 116 C33 126 34 136 34 150 M34 150 C40 132 48 126 54 124 C52 136 44 144 34 150 M34 150 C30 134 36 118 40 110" stroke="#4F8A5B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {/* 러그 */}
        <ellipse cx="160" cy="176" rx="96" ry="11" fill="var(--space-accent)" opacity="0.18" />
        {/* 주인 (미니미) */}
        {minimi && (
          <image href={minimiUrl(minimi)} x="100" y="50" width="120" height="120" />
        )}
        {/* 책상 */}
        <rect x="88" y="148" width="144" height="10" rx="4" fill="#D6AE84" />
        <rect x="96" y="158" width="128" height="20" rx="3" fill="#C49A70" />
        <rect x="203" y="134" width="12" height="14" rx="3" fill="#fff" stroke="#C49A70" strokeWidth="1.5" />
        <path d="M215 138 q6 2 0 7" stroke="#C49A70" strokeWidth="1.5" fill="none" />
      </svg>
      {statusMessage && (
        <figcaption className="absolute top-3 left-1/2 max-w-[70%] -translate-x-1/2 rounded-2xl bg-surface px-3 py-1.5 text-center text-caption font-medium text-fg shadow-2 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-transparent after:border-t-[var(--surface)] after:content-['']">
          {statusMessage}
        </figcaption>
      )}
    </figure>
  );
}
