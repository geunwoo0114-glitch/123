/**
 * 공간 꾸미기 토큰. DB에는 아래 id만 저장되고, 실제 색/패턴은 코드의 허용 목록에서만 나온다.
 * (사용자 입력 CSS를 저장/주입하지 않으므로 CSS injection이 불가능)
 * 새 테마/배경을 추가하려면 이 파일과 globals.css의 패턴 클래스만 늘리면 된다.
 * 향후 프리미엄/시즌 테마는 `tier` 필드로 구분한다.
 */
export type ThemeTier = "free" | "season" | "premium";

export type SpaceTheme = {
  id: string;
  name: string;
  tier: ThemeTier;
  /** 강조색 */
  accent: string;
  /** 강조색 위 텍스트 */
  onAccent: string;
  /** 연한 강조 배경 (라이트) */
  soft: string;
  /** 공간 배경 틴트 (라이트/다크) */
  tint: string;
  tintDark: string;
  softDark: string;
};

export const spaceThemes = [
  { id: "peach", name: "복숭아", tier: "free", accent: "#E8603C", onAccent: "#fff", soft: "#FDEBE3", tint: "#FBF3EC", tintDark: "#221A16", softDark: "#3A241B" },
  { id: "butter", name: "버터", tier: "free", accent: "#C98A0C", onAccent: "#fff", soft: "#FBF0D2", tint: "#FBF7EA", tintDark: "#1F1B12", softDark: "#382D14" },
  { id: "mint", name: "민트", tier: "free", accent: "#1F8F74", onAccent: "#fff", soft: "#DCF2EA", tint: "#F1F8F4", tintDark: "#141E1A", softDark: "#17352C" },
  { id: "sky", name: "하늘", tier: "free", accent: "#2F78C4", onAccent: "#fff", soft: "#E0EDFA", tint: "#F1F6FB", tintDark: "#141A21", softDark: "#1A2C40" },
  { id: "lavender", name: "라벤더", tier: "free", accent: "#7A5CC2", onAccent: "#fff", soft: "#ECE5F8", tint: "#F6F3FB", tintDark: "#1A1722", softDark: "#2D2540" },
  { id: "rose", name: "로즈", tier: "free", accent: "#CF4D72", onAccent: "#fff", soft: "#FBE4EB", tint: "#FBF2F5", tintDark: "#211519", softDark: "#3D1F29" },
  { id: "forest", name: "숲", tier: "free", accent: "#4D7A3E", onAccent: "#fff", soft: "#E4EEDC", tint: "#F3F6EF", tintDark: "#161B13", softDark: "#25331D" },
  { id: "ink", name: "먹색", tier: "free", accent: "#2E2A26", onAccent: "#fff", soft: "#E9E5DF", tint: "#F5F3EF", tintDark: "#161514", softDark: "#2E2B28" },
] as const satisfies readonly SpaceTheme[];

export type SpaceThemeId = (typeof spaceThemes)[number]["id"];

export const spaceBackgrounds = [
  { id: "plain", name: "기본" },
  { id: "paper", name: "종이" },
  { id: "dots", name: "도트" },
  { id: "grid", name: "모눈" },
  { id: "lines", name: "줄노트" },
  { id: "checker", name: "체크" },
] as const;
export type SpaceBackgroundId = (typeof spaceBackgrounds)[number]["id"];

export const spaceLayouts = [
  { id: "classic", name: "클래식", description: "프로필이 옆에 있는 2단 구성" },
  { id: "cover", name: "커버", description: "큰 커버 사진 아래 프로필" },
] as const;
export type SpaceLayoutId = (typeof spaceLayouts)[number]["id"];

export const cardStyles = [
  { id: "soft", name: "부드럽게" },
  { id: "outline", name: "선으로" },
  { id: "sticker", name: "스티커" },
] as const;
export type CardStyleId = (typeof cardStyles)[number]["id"];

/** 공간 홈에 배치되는 위젯. 순서/표시 여부를 사용자가 정한다. */
export const spaceWidgets = [
  { id: "intro", name: "소개" },
  { id: "music", name: "BGM" },
  { id: "recent", name: "최근 소식" },
  { id: "diary", name: "다이어리" },
  { id: "photos", name: "사진첩" },
  { id: "guestbook", name: "방명록" },
  { id: "friends", name: "친구" },
] as const;
export type SpaceWidgetId = (typeof spaceWidgets)[number]["id"];
export type WidgetSetting = { id: SpaceWidgetId; visible: boolean };

export const defaultWidgets: WidgetSetting[] = spaceWidgets.map((w) => ({ id: w.id, visible: true }));

/** DB JSON → 안전한 위젯 목록 (알 수 없는 값 제거, 누락된 위젯 보충) */
export function normalizeWidgets(raw: unknown): WidgetSetting[] {
  const known = new Set<string>(spaceWidgets.map((w) => w.id));
  const out: WidgetSetting[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === "object" && "id" in item && known.has(String(item.id)) && !out.some((o) => o.id === item.id)) {
        out.push({ id: item.id as SpaceWidgetId, visible: "visible" in item ? Boolean(item.visible) : true });
      }
    }
  }
  for (const w of spaceWidgets) if (!out.some((o) => o.id === w.id)) out.push({ id: w.id, visible: true });
  return out;
}

export function getTheme(id: string | null | undefined): SpaceTheme {
  return spaceThemes.find((t) => t.id === id) ?? spaceThemes[0];
}

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((x) => x.id) as [T[number]["id"], ...T[number]["id"][]];
export const themeIds = ids(spaceThemes);
export const backgroundIds = ids(spaceBackgrounds);
export const layoutIds = ids(spaceLayouts);
export const cardStyleIds = ids(cardStyles);

/** 공간 루트 요소에 넣을 CSS 변수 (값은 모두 허용 목록에서 옴) */
export function themeStyle(themeId: string): Record<string, string> {
  const t = getTheme(themeId);
  return {
    "--space-accent": t.accent,
    "--space-on-accent": t.onAccent,
    "--space-soft": t.soft,
    "--space-tint": t.tint,
    "--space-soft-dark": t.softDark,
    "--space-tint-dark": t.tintDark,
  };
}
