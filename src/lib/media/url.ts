/** 클라이언트/서버 공용: 스토리지 key → URL */
export function mediaUrl(key: string | null | undefined): string | null {
  return key ? `/media/${key}` : null;
}
