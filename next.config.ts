import type { NextConfig } from "next";

/**
 * Content-Security-Policy (운영 빌드에서만; 개발 서버는 HMR 때문에 제외).
 * Next.js 인라인 부트스트랩 스크립트 때문에 script-src에 'unsafe-inline'을 두지만,
 * 외부 스크립트/프레임/플러그인/폼 전송 대상은 엄격히 제한한다.
 * 프레임은 BGM 공식 플레이어(Spotify, YouTube nocookie)만 허용.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://open.spotify.com https://www.youtube-nocookie.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: csp },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Docker 배포용: 필요한 파일만 담은 .next/standalone 생성
  output: "standalone",
  serverExternalPackages: ["sharp"],
  async rewrites() {
    // 공개 주소는 /@username, 내부 라우트는 /u/[username]
    return [
      { source: "/@:username", destination: "/u/:username" },
      { source: "/@:username/:path*", destination: "/u/:username/:path*" },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // 서비스 워커는 항상 최신 버전을 받도록 캐시하지 않는다
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
