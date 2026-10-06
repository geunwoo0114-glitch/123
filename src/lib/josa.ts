/** 한국어 조사 자동 선택: 마지막 글자에 받침이 있으면 a, 없으면 b (예: 을/를, 이/가, 은/는) */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return `${word}${withoutBatchim}`;
  return `${word}${(last - 0xac00) % 28 > 0 ? withBatchim : withoutBatchim}`;
}
