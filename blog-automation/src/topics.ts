/**
 * topics.md의 체크리스트가 글감 대기열이다.
 *   - [ ] 아직 안 쓴 주제
 *   - [x] 이미 쓴 주제 → 2026-10-11-slug.md
 */
const OPEN = /^(\s*[-*]\s+)\[ \]\s+(.+?)\s*$/;

export function nextTopic(markdown: string): string | null {
  for (const line of markdown.split("\n")) {
    const m = OPEN.exec(line);
    if (m) return m[2];
  }
  return null;
}

export function markDone(markdown: string, topic: string, postFile: string): string {
  const lines = markdown.split("\n");
  const i = lines.findIndex((line) => OPEN.exec(line)?.[2] === topic);
  if (i === -1) return markdown;
  const [, bullet] = OPEN.exec(lines[i])!;
  lines[i] = `${bullet}[x] ${topic} → ${postFile}`;
  return lines.join("\n");
}
