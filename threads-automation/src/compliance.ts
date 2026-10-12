import type { Settings } from "./schema.js";

/** Threads 글 하나의 최대 길이(Meta 문서: 텍스트 게시물 500자). */
export const THREADS_MAX_CHARS = 500;
/** 글 하나에 넣을 수 있는 서로 다른 링크 수(제3자 안내 기준, 넘치면 API가 거절). */
export const THREADS_MAX_LINKS = 5;

const COUPANG_HOSTS = ["link.coupang.com", "coupa.ng", "www.coupang.com", "coupang.com", "m.coupang.com"];

export interface Issue {
  level: "error" | "warning";
  message: string;
}

export interface CheckResult {
  text: string;
  length: number;
  issues: Issue[];
  ok: boolean;
}

/** 사람이 보는 글자 수에 가깝게 센다(이모지 하나 = 1). Meta가 실제로 어떻게 세는지는 공개 문서에 자세히 없으므로 여유를 두자. */
export function countChars(text: string): number {
  return [...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(text)].length;
}

/** 설정대로 광고 문구 + 본문 + 링크를 합친 최종 글 */
export function composeText(body: string, linkUrl: string, disclosure: Settings["disclosure"]): string {
  const main = [body.trim(), linkUrl.trim()].filter(Boolean).join("\n\n");
  const notice = disclosure.text.trim();
  if (!notice) return main;
  return disclosure.position === "top" ? `${notice}\n\n${main}` : `${main}\n\n${notice}`;
}

function urlsIn(text: string): string[] {
  return [...new Set(text.match(/https?:\/\/[^\s<>"']+/g) ?? [])];
}

/** 광고 고지 문구에 쓰면 안 된다고 안내되는 모호한 표현(공정위 지침 해설 기준) */
const VAGUE_DISCLOSURE = [/sponsored/i, /\bpartner\b/i, /thanks\s*to/i, /collaboration/i, /유료\s*AD/i];

/** 본문에 넣으면 문제가 될 수 있는 표현: 근거 없는 단정, 제휴 글인데 직접 구매처럼 보이게 하는 말 */
const RISKY_BODY: { pattern: RegExp; level: Issue["level"]; message: string }[] = [
  { pattern: /내돈내산|제\s*돈\s*주고\s*산/, level: "error", message: "제휴 링크 글에 '내돈내산'처럼 대가 없는 구매로 보이는 표현은 쓸 수 없습니다." },
  { pattern: /최저가|역대\s*최저/, level: "warning", message: "'최저가'는 가격이 바뀌면 거짓이 됩니다. 확인한 시점과 함께 쓰거나 빼세요." },
  { pattern: /100\s*%|무조건|완벽|효과\s*보장|부작용\s*없/, level: "warning", message: "단정·보장 표현이 있습니다. 근거가 없다면 고쳐 주세요." },
  { pattern: /완치|치료|병이\s*낫|살이\s*빠/, level: "warning", message: "효능·의학적 효과처럼 읽히는 표현이 있습니다. 식품·화장품 광고 규제에 걸릴 수 있어요." },
  { pattern: /(1위|판매\s*1등|베스트\s*1)/, level: "warning", message: "순위 표현은 출처를 확인할 수 있을 때만 쓰세요." },
];

/** 예약 전에 반드시 통과해야 하는 검사. error가 하나라도 있으면 예약할 수 없다. */
export function checkPost(body: string, linkUrl: string, settings: Pick<Settings, "disclosure">): CheckResult {
  const issues: Issue[] = [];
  const text = composeText(body, linkUrl, settings.disclosure);
  const length = countChars(text);
  const notice = settings.disclosure.text.trim();

  if (!body.trim()) issues.push({ level: "error", message: "본문이 비어 있습니다." });

  if (!notice) {
    issues.push({ level: "error", message: "광고 표시 문구가 비어 있습니다. 설정에서 문구를 넣어 주세요." });
  } else {
    if (!/광고|협찬/.test(notice)) {
      issues.push({ level: "warning", message: "광고 문구에 '광고'나 '협찬'처럼 한눈에 알 수 있는 단어를 넣는 것이 안전합니다." });
    }
    if (VAGUE_DISCLOSURE.some((p) => p.test(notice))) {
      issues.push({ level: "error", message: "광고 문구에 'sponsored·partner·thanks to'처럼 모호한 표현은 쓰지 않도록 안내되고 있습니다." });
    }
  }

  let url: URL | null = null;
  try {
    url = new URL(linkUrl.trim());
    if (!/^https?:$/.test(url.protocol)) url = null;
  } catch {
    url = null;
  }
  if (!url) {
    issues.push({ level: "error", message: "제휴 링크가 없거나 올바른 주소가 아닙니다." });
  } else if (!COUPANG_HOSTS.includes(url.hostname)) {
    issues.push({ level: "warning", message: `쿠팡 파트너스 링크가 아닌 것 같습니다(${url.hostname}). 파트너스 사이트에서 만든 링크인지 확인하세요.` });
  } else if (url.hostname.endsWith("coupang.com") && url.hostname !== "link.coupang.com") {
    issues.push({ level: "warning", message: "일반 쿠팡 상품 주소입니다. 파트너스에서 만든 링크(link.coupang.com)가 아니면 수수료가 잡히지 않습니다." });
  }

  if (urlsIn(text).length > THREADS_MAX_LINKS) {
    issues.push({ level: "error", message: `링크는 글 하나에 ${THREADS_MAX_LINKS}개까지만 넣을 수 있습니다.` });
  }
  if (length > THREADS_MAX_CHARS) {
    issues.push({ level: "error", message: `광고 문구·링크를 합쳐 ${length}자입니다. Threads 한도 ${THREADS_MAX_CHARS}자 이내로 줄여 주세요.` });
  } else if (length > THREADS_MAX_CHARS - 20) {
    issues.push({ level: "warning", message: `${length}자로 한도(${THREADS_MAX_CHARS}자)에 가깝습니다. 링크·이모지 세는 방식에 따라 넘칠 수 있어요.` });
  }

  for (const rule of RISKY_BODY) {
    if (rule.pattern.test(body)) issues.push({ level: rule.level, message: rule.message });
  }

  return { text, length, issues, ok: !issues.some((i) => i.level === "error") };
}
