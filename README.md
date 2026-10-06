# 다락 (darak)

> 나만의 작은 방, 친구가 놀러 오는 곳.
> **피드를 소비하는 SNS가 아니라, 사람의 공간을 방문하는 SNS.**

싸이월드가 가졌던 **개인 공간 · 방문 · 관계 · 추억 · 꾸미기**를 2026년 기준으로 다시 해석한 SNS입니다.
경쟁 서비스 비교와 보완 과제는 [`docs/PRODUCT_RESEARCH.md`](docs/PRODUCT_RESEARCH.md)에 정리돼 있습니다.

## 주요 기능

| 영역 | 기능 |
|---|---|
| 내 공간 `/@아이디` | 미니룸, 상태 메시지, TODAY/TOTAL 방문자, 테마 8종·배경 6종·레이아웃 2종·카드 스타일 3종, 위젯 순서/표시, BGM(Spotify/YouTube 공식 임베드), 대표 글 고정 |
| 관계 | 친구 신청/수락/거절/취소/끊기, **우리 사이 이름(일촌명)**, 친한 친구, 소식 받기(팔로우), 차단, 신고 |
| 기록 | 소식(사진 10장·기분·태그·링크), 다이어리(날씨·기분·장소·태그·캘린더·검색·지난 오늘·오늘의 질문), 사진첩(앨범·커버·라이트박스) |
| 방명록 | 메모지 스티커, 비밀글, 주인 답글, 무한 스크롤 |
| 홈 | 친구들의 상태 스트립, 시간순 피드(소식+공유된 일기+사진첩 업데이트), 각 카드의 '놀러가기' 동선, 친구 추천 |
| 미니게임 타운 | 출석 체크(7일 연속 보너스), 미니게임 2종(짝꿍 찾기·밤톨 줍기), **미니미 상점**, 옷장 |
| 기타 | 알림(중복 방지·수신 설정), 검색(사람/태그/공개 글), 온보딩, 다크 모드, PWA manifest |

공개 범위는 모든 콘텐츠에 **전체 / 친구 / 친한 친구 / 나만** 4단계로 적용되며, 서버에서 검사합니다.

## 기술 스택

- **Next.js 16** (App Router, Server Components, Server Actions, Turbopack) · **React 19** · **TypeScript**
- **PostgreSQL** + **Prisma 6**
- **Tailwind CSS v4** + CSS 변수 디자인 토큰 (테마/다크 모드)
- 인증: 자체 구현 DB 세션(httpOnly 쿠키, SHA-256 토큰 해시) + scrypt 비밀번호 해시
- 검증: **zod** (모든 서버 입력) · 이미지: **sharp** (EXIF 회전 보정/메타데이터 제거/webp/썸네일)
- 미니미: **DiceBear Notionists** (CC0) · 아이콘: lucide-react · 폰트: Pretendard
- 테스트: **Vitest**(권한/검증/경제 로직) · **Playwright**(핵심 사용자 흐름, 데스크톱+모바일)

## 시작하기

```bash
# 1) 의존성
npm install

# 2) 환경 변수
cp .env.example .env    # DATABASE_URL 수정

# 3) DB 마이그레이션 + 데모 데이터
npm run db:migrate
npm run db:seed         # 데모 로그인: minji / darak1234

# 4) 개발 서버
npm run dev             # http://localhost:3000
```

### 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` / `build` / `start` | 개발 / 빌드 / 실행 |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:e2e` | E2E (Playwright, `npm run build` 후 실행. 브라우저 경로는 `PW_CHROMIUM_PATH`로 지정 가능) |
| `npm run db:migrate` · `db:deploy` · `db:seed` | 마이그레이션(개발) · 운영 배포 · 시드 |

E2E는 같은 IP에서 로그인을 반복하므로 테스트 서버는 `RATE_LIMIT_MULTIPLIER=50`으로 띄우는 것을 권장합니다.

## 구조

```
src/
  app/                 라우트 (App Router)
    (auth)/            로그인·가입
    (app)/             앱 셸(사이드바/하단 탭)이 있는 화면
      u/[username]/    개인 공간 (/@username 으로 rewrite)
      town/            미니게임 타운 (광장/상점/옷장/게임)
    api/uploads        이미지 업로드
    media/[...key]     업로드 이미지 제공
    minimi/[code]      미니미 SVG 렌더링
  features/<도메인>/    schemas(zod) · queries(읽기) · actions(Server Actions) · service
    privacy/policy.ts  공개 범위/권한 규칙(순수 함수, 테스트됨)
  components/          ui(디자인 시스템) · content · space · town · home · settings
  config/              brand(서비스명·재화명) · app(한도·페이지 크기 등)
  lib/                 db · auth · rate-limit · media · dates · logger
prisma/                schema · migrations · seed
e2e/                   Playwright
docs/                  제품 리서치
```

## 보안 메모

- 모든 변경은 Server Action/Route Handler에서 **로그인·소유권·공개 범위·차단 관계**를 다시 검사합니다 (UI 숨김에 의존하지 않음). 남의 리소스 요청은 "없음"과 같은 응답(IDOR 방지).
- Rate limit: 로그인(IP+계정), 가입, 친구 신청, 댓글, 좋아요, 방명록, 업로드, 신고, 게임 — Postgres 원자적 UPSERT 기반이라 다중 인스턴스에서도 동작.
- 업로드: MIME을 믿지 않고 실제 디코딩, 크기/픽셀 제한, EXIF(위치정보) 제거, 서버 생성 키만 허용(경로 조작 방지).
- 사용자 꾸미기는 CSS 문자열이 아닌 **허용 목록 토큰**으로만 저장. BGM은 Spotify/YouTube 공식 임베드만 허용.
- 재화: 원장(CoinTransaction) + 멱등 키, 잔액 조건부 차감으로 동시 구매 race 방지, 게임 점수는 서버 경과 시간으로 검증.
- 알려진 한계: 업로드 이미지는 추측 불가능한 URL로 제공되며 공개 범위별 서명 URL은 아직 없음(스토리지 교체 시 도입 예정).

## 라이선스 / 크레딧

미니미 그림: DiceBear "Notionists" by Zoish — CC0 1.0. 아이콘: Lucide (ISC). 폰트: Pretendard (OFL).
