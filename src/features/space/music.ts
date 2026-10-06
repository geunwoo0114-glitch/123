/**
 * BGM: 음원을 직접 제공하지 않고, 공식 임베드를 지원하는 서비스의 링크만 허용한다.
 * (저작권 문제를 피하기 위해 각 플랫폼의 공식 플레이어로 재생)
 */
export type MusicEmbed = { provider: "spotify" | "youtube"; embedUrl: string };

export function parseMusicUrl(raw: string | null | undefined): MusicEmbed | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");

  if (host === "open.spotify.com") {
    const m = url.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{10,40})/);
    if (m) return { provider: "spotify", embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` };
  }
  let videoId: string | null = null;
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    videoId = url.searchParams.get("v");
  } else if (host === "youtu.be") {
    videoId = url.pathname.slice(1);
  }
  if (videoId && /^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
    return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}` };
  }
  return null;
}
