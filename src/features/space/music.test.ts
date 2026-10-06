import { describe, expect, it } from "vitest";
import { parseMusicUrl } from "./music";

describe("parseMusicUrl", () => {
  it("Spotify 트랙/플레이리스트 링크를 임베드 URL로 변환", () => {
    expect(parseMusicUrl("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x")?.embedUrl).toBe(
      "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator",
    );
    expect(parseMusicUrl("https://open.spotify.com/intl-ko/playlist/37i9dQZF1DX0XUsuxWHRQd")?.provider).toBe("spotify");
  });
  it("YouTube 링크를 nocookie 임베드로 변환", () => {
    expect(parseMusicUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(parseMusicUrl("https://youtu.be/dQw4w9WgXcQ")?.provider).toBe("youtube");
  });
  it("허용하지 않는 링크는 거부", () => {
    expect(parseMusicUrl("http://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")).toBeNull();
    expect(parseMusicUrl("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseMusicUrl("javascript:alert(1)")).toBeNull();
    expect(parseMusicUrl("https://youtube.com/watch?v=<script>")).toBeNull();
  });
});
