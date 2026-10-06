import { minimiUrl, type AvatarConfig } from "@/features/avatar/schema";
import { defaultRoom, type RoomConfig } from "@/features/room/schema";

/**
 * 미니룸: 공간 주인이 자기 방 책상 앞에 앉아 있는 장면 (SVG, 서버/클라이언트 공용).
 * 슬롯(벽지·바닥·창문·선반·벽 장식·소품·책상·러그)마다 아이템을 바꿔 끼운다.
 * 색은 공간 테마 CSS 변수(--space-*)를 따라가므로 테마를 바꾸면 방 분위기도 바뀐다.
 * 향후 3D 공간(React Three Fiber)으로 교체할 때 이 컴포넌트 자리만 바꾸면 된다.
 */
const A = "var(--space-accent)";
const SOFT = "var(--space-soft-current)";

function Wall({ v }: { v: number }) {
  switch (v) {
    case 1:
      return (
        <>
          <rect width="320" height="140" fill="#FBF6EE" />
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={i * 20} width="10" height="140" fill={A} opacity="0.12" />
          ))}
        </>
      );
    case 2:
      return <rect width="320" height="140" fill="#F6EFE3" />;
    case 3:
      return (
        <>
          <rect width="320" height="140" fill="#C9775A" />
          {Array.from({ length: 10 }, (_, r) =>
            Array.from({ length: 9 }, (_, c) => (
              <rect key={`${r}-${c}`} x={c * 38 - (r % 2 ? 19 : 0)} y={r * 14} width="36" height="12" rx="1.5" fill="#D98A6C" />
            )),
          )}
        </>
      );
    case 4:
      return (
        <>
          <rect width="320" height="140" fill="#22264A" />
          {[[20, 20], [60, 50], [110, 14], [150, 40], [205, 22], [250, 46], [290, 16], [180, 90], [40, 100], [300, 104], [130, 110]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 ? 1.4 : 2.2} fill="#FFF4C2" opacity="0.9" />
          ))}
        </>
      );
    case 5:
      return (
        <>
          <rect width="320" height="140" fill="#FDF3F1" />
          {Array.from({ length: 6 }, (_, r) =>
            Array.from({ length: 9 }, (_, c) => (
              <g key={`${r}-${c}`} transform={`translate(${c * 38 + (r % 2 ? 19 : 0)} ${r * 26 + 10})`} opacity="0.55">
                {[0, 72, 144, 216, 288].map((d) => (
                  <ellipse key={d} cy="-3.2" rx="2.4" ry="3.4" fill={A} opacity="0.45" transform={`rotate(${d})`} />
                ))}
                <circle r="1.6" fill="#F2C14E" />
              </g>
            )),
          )}
        </>
      );
    default:
      return (
        <>
          <defs>
            <pattern id="room-dots" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="8" cy="8" r="1.4" fill={A} opacity="0.18" />
            </pattern>
          </defs>
          <rect width="320" height="140" fill={SOFT} />
          <rect width="320" height="140" fill="url(#room-dots)" />
        </>
      );
  }
}

function Floor({ v }: { v: number }) {
  const base = <path d="M0 140 L320 140" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />;
  switch (v) {
    case 1:
      return (
        <>
          <rect y="140" width="320" height="50" fill="#C99A6B" />
          {[150, 162, 174, 186].map((y) => (
            <path key={y} d={`M0 ${y} H320`} stroke="#B3845A" strokeWidth="1" />
          ))}
          {base}
        </>
      );
    case 2:
      return (
        <>
          <rect y="140" width="320" height="50" fill="#F4EFE6" />
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 27 }, (_, c) => ((r + c) % 2 ? <rect key={`${r}-${c}`} x={c * 12} y={140 + r * 12.5} width="12" height="12.5" fill="#2E2A26" opacity="0.75" /> : null)),
          )}
          {base}
        </>
      );
    case 3:
      return (
        <>
          <rect y="140" width="320" height="50" fill="#7FA77A" />
          {base}
        </>
      );
    case 4:
      return (
        <>
          <rect y="140" width="320" height="50" fill="#EDEAE6" />
          <path d="M20 150 q40 10 80 2 M140 170 q50 -8 110 6 M230 148 q30 6 70 -2" stroke="#C9C3BB" strokeWidth="1.2" fill="none" />
          {base}
        </>
      );
    default:
      return (
        <>
          <rect y="140" width="320" height="50" fill={A} opacity="0.22" />
          <path d="M0 140 L320 140" stroke={A} strokeOpacity="0.35" strokeWidth="2" />
        </>
      );
  }
}

function Window({ v }: { v: number }) {
  const sky = ["#BFE0F5", "#2B3166", "#F6B48C", "#9AA7B5"][v] ?? "#BFE0F5";
  return (
    <g>
      <rect x="28" y="26" width="72" height="58" rx="6" fill="#fff" />
      <rect x="33" y="31" width="62" height="48" rx="3" fill={sky} />
      {v === 0 && <circle cx="80" cy="44" r="7" fill="#FFE29A" />}
      {v === 1 && (
        <>
          <circle cx="78" cy="44" r="7" fill="#FFF4C2" />
          <circle cx="82" cy="41" r="6" fill={sky} />
          <circle cx="45" cy="40" r="1" fill="#fff" />
          <circle cx="58" cy="50" r="1" fill="#fff" />
        </>
      )}
      {v === 2 && <circle cx="64" cy="66" r="10" fill="#FF8A5B" />}
      {v === 3 &&
        [38, 48, 58, 68, 78, 88].map((x, i) => <path key={x} d={`M${x} ${36 + (i % 2) * 6} l-3 8`} stroke="#E6EEF5" strokeWidth="1.4" strokeLinecap="round" />)}
      <path d="M33 70 Q50 58 64 68 T95 64 L95 79 L33 79 Z" fill={v === 1 ? "#3D4A7A" : v === 2 ? "#C9785A" : "#9FD1A6"} />
      <path d="M64 31 V79 M33 55 H95" stroke="#fff" strokeWidth="3" />
    </g>
  );
}

function Shelf({ v }: { v: number }) {
  const board = <rect x="226" y="58" width="70" height="5" rx="2" fill="#B98B62" />;
  switch (v) {
    case 1:
      return (
        <g>
          {board}
          {[232, 238, 244, 250].map((x, i) => (
            <rect key={x} x={x} y="38" width="5" height="20" rx="1" fill={["#2E2A26", A, "#E3B23C", "#5E8C6A"][i]} />
          ))}
          <rect x="262" y="34" width="20" height="24" rx="3" fill="#3B3632" />
          <circle cx="272" cy="42" r="4" fill="#6A625A" />
          <circle cx="272" cy="52" r="3" fill="#6A625A" />
        </g>
      );
    case 2:
      return (
        <g>
          {board}
          {[236, 258, 278].map((x, i) => (
            <g key={x}>
              <path d={`M${x} ${40 + i * 2} h12 l-2 8 h-8 Z`} fill="#E3B23C" />
              <rect x={x + 4} y={48 + i * 2} width="4" height="6" fill="#E3B23C" />
              <rect x={x + 1} y="54" width="10" height="4" rx="1" fill="#8C5A35" />
            </g>
          ))}
        </g>
      );
    case 3:
      return (
        <g>
          {board}
          {[234, 256, 278].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 48 h12 l-2 10 h-8 Z`} fill={["#C98A5E", "#E9E3DA", A][i]} />
              <circle cx={x + 6} cy="42" r="6" fill="#5E8C6A" />
            </g>
          ))}
        </g>
      );
    case 4:
      return board;
    default:
      return (
        <g>
          {board}
          <rect x="232" y="36" width="8" height="22" rx="1.5" fill={A} />
          <rect x="242" y="40" width="7" height="18" rx="1.5" fill="#E3B23C" />
          <rect x="251" y="34" width="9" height="24" rx="1.5" fill="#5E8C6A" />
          <rect x="268" y="38" width="22" height="20" rx="2" fill="#fff" stroke="#B98B62" strokeWidth="2" />
          <path d="M272 54 L278 46 L282 51 L285 48 L287 54 Z" fill={A} opacity="0.7" />
        </g>
      );
  }
}

function Deco({ v }: { v: number }) {
  switch (v) {
    case 1:
      return (
        <g>
          <circle cx="262" cy="96" r="14" fill="#fff" stroke="#2E2A26" strokeWidth="2.5" />
          <path d="M262 96 V88 M262 96 L268 99" stroke="#2E2A26" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 2:
      return (
        <g transform="rotate(3 266 100)">
          <rect x="244" y="76" width="44" height="56" rx="2" fill={A} />
          <circle cx="266" cy="96" r="10" fill="#fff" opacity="0.85" />
          <rect x="252" y="114" width="28" height="4" rx="2" fill="#fff" opacity="0.85" />
          <rect x="256" y="121" width="20" height="3" rx="1.5" fill="#fff" opacity="0.6" />
        </g>
      );
    case 3:
      return (
        <g>
          <path d="M0 8 Q80 26 160 10 T320 10" stroke="#6A625A" strokeWidth="1.2" fill="none" />
          {Array.from({ length: 13 }, (_, i) => {
            const x = 12 + i * 24;
            const y = 8 + Math.sin((i / 12) * Math.PI * 2) * 6 + 8;
            return <circle key={i} cx={x} cy={y} r="3.2" fill={["#FFD166", "#EF8A62", "#7FC8A9", "#A5B4FC"][i % 4]} />;
          })}
        </g>
      );
    case 4:
      return (
        <g transform="rotate(-4 262 100)">
          <rect x="242" y="80" width="40" height="42" rx="2" fill="#fff" stroke="#B98B62" strokeWidth="3" />
          <rect x="248" y="86" width="28" height="24" fill={SOFT} />
          <circle cx="262" cy="96" r="6" fill={A} opacity="0.6" />
        </g>
      );
    default:
      return null;
  }
}

function Corner({ v }: { v: number }) {
  switch (v) {
    case 1:
      return (
        <g>
          <path d="M28 70 h22 l-6 16 h-10 Z" fill="#F6E7B8" />
          <rect x="38" y="86" width="2.5" height="86" fill="#6A625A" />
          <ellipse cx="39" cy="174" rx="12" ry="3" fill="#6A625A" />
          <circle cx="39" cy="80" r="16" fill="#FFE9A8" opacity="0.25" />
        </g>
      );
    case 2:
      return (
        <g transform="rotate(-12 40 140)">
          <ellipse cx="40" cy="152" rx="15" ry="18" fill="#C98A5E" />
          <ellipse cx="40" cy="132" rx="11" ry="12" fill="#C98A5E" />
          <circle cx="40" cy="140" r="5" fill="#5A3A2A" />
          <rect x="37" y="80" width="6" height="52" fill="#8C5A35" />
          <rect x="35" y="74" width="10" height="10" rx="2" fill="#5A3A2A" />
        </g>
      );
    case 3:
      return (
        <g>
          <ellipse cx="42" cy="172" rx="22" ry="6" fill={A} opacity="0.35" />
          <ellipse cx="42" cy="162" rx="18" ry="12" fill="#F2B880" />
          <circle cx="56" cy="150" r="10" fill="#F2B880" />
          <path d="M49 143 l2 -8 l5 6 M60 141 l4 -7 l2 8" fill="#F2B880" stroke="#F2B880" strokeWidth="1" />
          <path d="M53 150 h0.1 M59 150 h0.1" stroke="#2B2320" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 164 q-8 -12 2 -20" stroke="#F2B880" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 4:
      return (
        <g>
          <rect x="12" y="88" width="50" height="88" rx="3" fill="#B98B62" />
          {[100, 128, 156].map((y, r) => (
            <g key={y}>
              <rect x="16" y={y - 8} width="42" height="2" fill="#8C5A35" />
              {[0, 1, 2, 3, 4].map((i) => (
                <rect key={i} x={18 + i * 8} y={y - 4 - 18 + (i % 2) * 3} width="6" height={18 - (i % 2) * 3} fill={[A, "#E3B23C", "#5E8C6A", "#2F78C4", "#CF4D72"][(i + r) % 5]} />
              ))}
            </g>
          ))}
        </g>
      );
    case 5:
      return null;
    default:
      return (
        <g>
          <path d="M24 150 L44 150 L41 176 L27 176 Z" fill="#C98A5E" />
          <path d="M34 150 C24 136 22 124 28 116 C33 126 34 136 34 150 M34 150 C40 132 48 126 54 124 C52 136 44 144 34 150 M34 150 C30 134 36 118 40 110" stroke="#4F8A5B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      );
  }
}

function Rug({ v }: { v: number }) {
  switch (v) {
    case 1:
      return (
        <g>
          <ellipse cx="160" cy="178" rx="100" ry="10" fill="#fff" opacity="0.7" />
          <ellipse cx="160" cy="178" rx="80" ry="7" fill="none" stroke={A} strokeWidth="3" opacity="0.6" />
          <ellipse cx="160" cy="178" rx="56" ry="4.5" fill="none" stroke={A} strokeWidth="3" opacity="0.6" />
        </g>
      );
    case 2:
      return (
        <g>
          {["#EF8A62", "#FFD166", "#7FC8A9", "#A5B4FC"].map((c, i) => (
            <ellipse key={c} cx="160" cy="179" rx={100 - i * 18} ry={11 - i * 2} fill={c} opacity="0.75" />
          ))}
        </g>
      );
    case 3:
      return null;
    default:
      return <ellipse cx="160" cy="176" rx="96" ry="11" fill={A} opacity="0.18" />;
  }
}

function Desk({ v }: { v: number }) {
  const [top, body] = [
    ["#D6AE84", "#C49A70"],
    ["#F4F1EC", "#E3DED6"],
    ["#4A3F36", "#3A3029"],
    ["#F6C6CF", "#EBAFBB"],
  ][v] ?? ["#D6AE84", "#C49A70"];
  return (
    <g>
      <rect x="88" y="148" width="144" height="10" rx="4" fill={top} />
      <rect x="96" y="158" width="128" height="20" rx="3" fill={body} />
      {v === 0 && (
        <>
          <rect x="203" y="134" width="12" height="14" rx="3" fill="#fff" stroke={body} strokeWidth="1.5" />
          <path d="M215 138 q6 2 0 7" stroke={body} strokeWidth="1.5" fill="none" />
        </>
      )}
      {v === 1 && (
        <>
          <path d="M186 128 h30 l4 20 h-38 Z" fill="#B9BEC6" />
          <rect x="188" y="130" width="26" height="15" rx="1.5" fill="#E6EEF5" />
        </>
      )}
      {v === 2 && (
        <>
          <rect x="196" y="136" width="20" height="12" rx="2" fill="#FBE4EB" />
          <rect x="196" y="133" width="20" height="4" rx="2" fill="#fff" />
          <rect x="205" y="126" width="2" height="7" fill="#F2C14E" />
          <circle cx="206" cy="125" r="1.8" fill="#EF8A62" />
        </>
      )}
      {v === 3 && (
        <>
          <path d="M202 148 l2 -14 h10 l2 14 Z" fill="#fff" />
          {[203, 209, 215].map((x, i) => (
            <circle key={x} cx={x} cy={128 - (i % 2) * 3} r="4" fill={["#F6A6B6", "#F2C14E", "#F6A6B6"][i]} />
          ))}
        </>
      )}
    </g>
  );
}

export function MiniRoom({ minimi, name, statusMessage, room = defaultRoom }: { minimi: AvatarConfig | null; name: string; statusMessage?: string; room?: RoomConfig }) {
  return (
    <figure className="relative overflow-hidden rounded-lg" aria-label={`${name}의 미니룸`}>
      <svg viewBox="0 0 320 190" className="block h-auto w-full" role="img" aria-label={`${name}의 방`}>
        <Wall v={room.wall} />
        <Floor v={room.floor} />
        <Window v={room.window} />
        <Shelf v={room.shelf} />
        <Deco v={room.deco} />
        <Rug v={room.rug} />
        <Corner v={room.corner} />
        {minimi && <image href={minimiUrl(minimi)} x="100" y="50" width="120" height="120" />}
        <Desk v={room.desk} />
      </svg>
      {statusMessage && (
        <figcaption className="absolute top-3 left-1/2 max-w-[70%] -translate-x-1/2 rounded-2xl bg-surface px-3 py-1.5 text-center text-caption font-medium text-fg shadow-2 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-transparent after:border-t-[var(--surface)] after:content-['']">
          {statusMessage}
        </figcaption>
      )}
    </figure>
  );
}
