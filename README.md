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
| 쪽지 | 1:1 쪽지(기본 '친구만' 정책, 누구나/받지 않기 선택), 안 읽은 쪽지 배지, 날짜 구분, 이전 쪽지 더 보기, 대화방 나가기, **실시간 전달**(SSE + Postgres LISTEN/NOTIFY, 끊기면 폴링으로 대체) |
| 기록 | 소식(사진 10장·기분·태그·링크), 다이어리(날씨·기분·장소·태그·캘린더·검색·지난 오늘·오늘의 질문), 사진첩(앨범·커버·라이트박스) |
| 방명록 | 메모지 스티커, 비밀글, 주인 답글, 무한 스크롤 |
| 홈 | 친구들의 상태 스트립, 시간순 피드(소식+공유된 일기+사진첩 업데이트), 각 카드의 '놀러가기' 동선, 친구 추천 |
| 미니게임 타운 | 출석 체크(7일 연속 보너스), 미니게임 2종(짝꿍 찾기·밤톨 줍기), **미니미 상점**, 옷장, **친구에게 아이템 선물하기** |
| 미니룸 | 벽지·바닥·창문·선반·벽 장식·소품·책상·러그 8개 자리 × 37종 아이템, 상점의 '미니룸' 탭, 방 꾸미기 편집기, 공간 테마 색 연동 |
| 2.5D 집 | 아이소메트릭 방(React Three Fiber, 정사영 카메라, 그림자·창문 빛·스탠드 조명, 낮/노을/밤), **Kenney Furniture Kit(CC0) 가구 37종** glTF, 칸 단위 자유 배치(끌기·방향키·회전·삭제·천 색 바꾸기), 겹침/받침(책상 위 소품) 규칙을 서버에서도 검증, 꾸미기 패널에서 바로 구매, 놀러 온 사람의 미니미가 방에 함께 서 있음, 90° 돌려 보기 |
| 지금 함께 있어요 | 같은 공간에 머무는 사람들의 미니미가 방 바닥에 함께 서 있음(15초 신호·45초 유지, 떠나면 즉시 사라짐). 로그인 사용자만, 공간을 볼 수 있는 사람만, 차단 관계 제외, '방문 흔적 남기기'를 끈 사람은 보이지 않음 |
| 앱 설치 · 푸시 | 홈 화면에 설치(PWA: 아이콘·바로가기, 안드로이드 설치 버튼, 아이폰 설치 안내), **웹 푸시 알림**(방명록·쪽지·친구 신청·댓글·선물), 기기별 켜고 끄기, **밤에는 조용히**(23~8시), 만료 구독 자동 정리 |
| 계정 보안 | 회원 탈퇴(비밀번호 확인, 모든 데이터·업로드 파일 즉시 삭제), 이용약관·개인정보처리방침(초안), 이메일 인증(가입 후 메일, 미인증 안내·재발송), 비밀번호 찾기/재설정(1시간 1회용 링크, 가입 여부 비노출, 모든 기기 로그아웃), 설정에서 비밀번호 변경(다른 기기 로그아웃) |
| 운영 | 운영자 전용 `/admin`: 대상별로 묶인 신고 목록(누적 수·사유·원본 보기), 콘텐츠 숨김 / 계정 정지(즉시 로그아웃) / 기각, 아이디로 정지·해제, 조치 기록(감사 로그) |
| 기타 | 알림(중복 방지·수신 설정), 검색(사람/태그/공개 글 — pg_trgm으로 부분 일치·오타 허용), 온보딩, 다크 모드 |

공개 범위는 모든 콘텐츠에 **전체 / 친구 / 친한 친구 / 나만** 4단계로 적용되며, 서버에서 검사합니다.

## 기술 스택

- **Next.js 16** (App Router, Server Components, Server Actions, Turbopack) · **React 19** · **TypeScript**
- **PostgreSQL** + **Prisma 6**
- **Tailwind CSS v4** + CSS 변수 디자인 토큰 (테마/다크 모드)
- 인증: 자체 구현 DB 세션(httpOnly 쿠키, SHA-256 토큰 해시) + scrypt 비밀번호 해시
- 검증: **zod** (모든 서버 입력) · 이미지: **sharp** (EXIF 회전 보정/메타데이터 제거/webp/썸네일)
- 미니미: **DiceBear Notionists** (CC0) · 아이콘: lucide-react · 폰트: Pretendard
- 푸시: **web-push**(VAPID) + 서비스 워커(`public/sw.js`) — 키가 없으면 푸시만 꺼진 채 동작
- 테스트: **Vitest**(권한/검증/경제 로직) · **Playwright**(핵심 사용자 흐름, 데스크톱+모바일)

## 시작하기

```bash
# 1) 의존성
npm install

# 2) 환경 변수
cp .env.example .env    # DATABASE_URL 수정
npx web-push generate-vapid-keys   # (선택) 푸시를 쓰려면 키를 .env에 넣기

# 3) DB 마이그레이션 + 데모 데이터
npm run db:migrate
npm run db:seed         # 데모 로그인: minji / darak1234 · 운영자: ops / darak1234

# 4) 개발 서버
npm run dev             # http://localhost:3000
```

### 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` / `build` / `start` | 개발 / 빌드 / 운영 서버 실행(standalone) |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:e2e` | E2E (Playwright). `npm run build` 후 실행하면 운영 빌드를 직접 띄워 테스트. 브라우저 경로는 `PW_CHROMIUM_PATH`로 지정 가능 |
| `npm run db:migrate` · `db:deploy` · `db:seed` | 마이그레이션(개발) · 운영 배포 · 시드 |

E2E가 직접 띄우는 테스트 서버는 같은 IP에서 로그인을 반복하므로 `RATE_LIMIT_MULTIPLIER=50`, 메일 보관함을 위해 `ENABLE_DEV_MAIL=1`로 실행됩니다(playwright.config.ts).

## 배포

**Docker (권장)** — Next.js standalone 이미지 + Postgres + 마이그레이션을 한 번에:

```bash
cp .env.example .env     # APP_URL, POSTGRES_PASSWORD, VAPID 키, SMTP_URL 등 설정
docker compose up --build -d
```

- `migrate` 서비스가 `prisma migrate deploy`를 실행한 뒤 `app`이 뜹니다.
- 업로드 이미지는 `uploads` 볼륨(`/data/uploads`)에 저장됩니다.
- 헬스체크: `GET /api/health` (DB 연결 확인).

**직접 실행** — `npm run build` 후 `npm start`(standalone 서버). 마이그레이션은 `npm run db:deploy`.

**CI** — `.github/workflows/ci.yml`: Postgres 서비스와 함께 lint → typecheck → 단위 테스트 → 빌드 → **운영 빌드 대상 E2E**(데스크톱+모바일).

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

## 메일

`SMTP_URL`(예: `smtps://user:pass@smtp.example.com`)을 설정하면 실제로 메일을 보냅니다. 비워 두면 개발 환경에서는 서버 로그와 `DevMail` 테이블에 남고, 테스트는 `/api/dev/mail?to=`로 링크를 읽습니다(운영 환경에서는 비활성).

## 보안 메모

- 모든 변경은 Server Action/Route Handler에서 **로그인·소유권·공개 범위·차단 관계**를 다시 검사합니다 (UI 숨김에 의존하지 않음). 남의 리소스 요청은 "없음"과 같은 응답(IDOR 방지).
- Rate limit: 로그인(IP+계정), 가입, 친구 신청, 댓글, 좋아요, 방명록, 업로드, 신고, 게임 — Postgres 원자적 UPSERT 기반이라 다중 인스턴스에서도 동작.
- 업로드: MIME을 믿지 않고 실제 디코딩, 크기/픽셀 제한, EXIF(위치정보) 제거, 서버 생성 키만 허용(경로 조작 방지).
- 운영 빌드는 Content-Security-Policy 적용: 외부 스크립트·플러그인 차단, 프레임은 BGM 공식 플레이어(Spotify·YouTube nocookie)만, 다른 사이트에 끼워 넣기 금지(frame-ancestors none).
- 사용자 꾸미기는 CSS 문자열이 아닌 **허용 목록 토큰**으로만 저장. BGM은 Spotify/YouTube 공식 임베드만 허용.
- 재화: 원장(CoinTransaction) + 멱등 키, 잔액 조건부 차감으로 동시 구매 race 방지, 게임 점수는 서버 경과 시간으로 검증.
- 이미지 권한: `/media/*`는 이미지가 쓰인 곳(게시물·다이어리·사진첩·프로필)의 공개 범위와 차단 관계를 매 요청 검사. 전체 공개만 공유 캐시, 나머지는 `private` 캐시. 아직 글에 붙이지 않은 업로드는 본인만. 버킷은 비공개로 두고 항상 이 라우트를 거친다.
- 저장소: 로컬 디스크 또는 S3 호환(`STORAGE_DRIVER=s3`, R2/MinIO 포함).

## 라이선스 / 크레딧

미니미 그림: DiceBear "Notionists" by Zoish — CC0 1.0. 아이콘: Lucide (ISC). 폰트: Pretendard (OFL).
