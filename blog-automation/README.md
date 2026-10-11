# ✍️ 블로그 자동화 프로그램

주제만 적으면 AI가 블로그 글을 써 주는 프로그램입니다. **Claude** 또는 **내 컴퓨터 AI(Ollama)** 를 고를 수 있고,
다 쓴 글은 화면에서 읽고 고친 뒤 **WordPress에 바로 올리거나**, **서식째 복사해서 네이버 블로그·티스토리에 붙여 넣을** 수 있어요.

## 친구에게: 이렇게 시작하세요 (5분)

1. **Node.js 설치** — [nodejs.org](https://nodejs.org/ko/download)에서 **LTS** 버전을 받아 설치합니다. (처음 한 번만)
2. **프로그램 받기** — [Releases의 blog-app.zip](https://github.com/geunwoo0114-glitch/123/releases/tag/blog-app)을 받아 압축을 풉니다.
   (zip 파일을 친구에게 카톡 등으로 그대로 보내 줘도 됩니다)
3. **실행** — 압축 푼 폴더에서
   - 윈도우: `start-windows.bat` 더블클릭
     ("Windows의 PC 보호" 창이 뜨면 **추가 정보 → 실행**)
   - 맥: `start-mac.command`를 **우클릭 → 열기** (처음 한 번만 이렇게, 다음부터는 더블클릭)

   처음에는 필요한 파일을 1~2분 설치하고, 브라우저에 프로그램 화면(`http://localhost:4848`)이 자동으로 열립니다.
4. **설정** 탭에서 AI를 연결합니다.
   - **Claude**: [console.anthropic.com](https://console.anthropic.com/settings/keys)에서 API 키를 만들어 붙여 넣고 **연결 확인**. (쓴 만큼 요금이 나옵니다)
   - **내 컴퓨터 AI**: [ollama.com](https://ollama.com/download)에서 Ollama 설치 → 터미널에서 `ollama pull qwen2.5:7b` → **Ollama 확인**. (무료, 컴퓨터가 좋을수록 빠름)
5. **블로그 성격**(이름·독자·말투)을 적고 **설정 저장**. 이제 **글쓰기** 탭에서 주제를 적고 ✨ 버튼을 누르면 끝!

> 프로그램 창(검은 창)을 닫으면 프로그램도 꺼집니다. 쓸 때마다 3번처럼 실행하세요.

## 화면 구성

| 탭 | 하는 일 |
|---|---|
| 글쓰기 | 주제·추가 요청을 적고 AI 선택 → 글 완성(보통 1~3분) → 미리보기·고치기·발행·복사 |
| 내 글 | 지금까지 쓴 글 목록. 눌러서 다시 열고 고치거나 발행 |
| 글감 목록 | 주제를 미리 쌓아 두기. 주제를 비우고 글쓰기를 누르면 위에서부터 하나씩 씀 |
| 설정 | AI 연결, 내 블로그 성격, WordPress·웹훅 연결 |

**어디에 올리나요?**
- **WordPress**: 설정에 사이트 주소·사용자 이름·[애플리케이션 비밀번호](https://wordpress.com/support/security/two-step-authentication/application-specific-passwords/)를 넣으면 🚀 버튼으로 올라갑니다. 기본은 **임시글**이라 한 번 읽고 공개하면 돼요.
- **네이버 블로그·티스토리**: 글쓰기 API가 없어서 자동으로 올릴 수는 없어요. **📋 서식째 복사** 후 블로그 글쓰기 화면에 붙여 넣으세요(제목·소제목·굵은 글씨 유지).
- **웹훅**: Make·Zapier·n8n을 쓰는 분은 웹훅 주소를 넣으면 글(JSON)을 보내 줍니다.

## 안심하고 쓰세요

- API 키·비밀번호는 **내 컴퓨터의 `settings.json`에만** 저장되고, 화면에는 `••••`로만 보입니다. 이 파일은 다른 사람에게 보내지 마세요.
- 프로그램은 **내 컴퓨터 안에서만** 열립니다(다른 사람이나 다른 사이트가 접속할 수 없음).
- AI는 사실을 틀릴 수 있어요. 숫자·정보는 올리기 전에 꼭 확인하세요.
- 쓴 글은 `posts/` 폴더에 `.md` 파일로도 남습니다.

## 자주 묻는 것

| 증상 | 해결 |
|---|---|
| 검은 창에 "Node.js가 설치되어 있지 않습니다" | 1번대로 Node.js LTS 설치 후 다시 실행 |
| "Claude API 키가 올바르지 않습니다" | 키를 다시 복사해 붙여 넣기, Anthropic 콘솔에서 결제 수단 등록 확인 |
| "Ollama에 연결하지 못했습니다" | Ollama 앱을 켜 두기 |
| "'모델' 모델이 없습니다" | 터미널에서 `ollama pull 모델이름` |
| 브라우저가 안 열려요 | 직접 `http://localhost:4848` 열기 (이미 켜져 있으면 4849, 4850…) |

---

## 고급: 자동 발행 (GitHub Actions)

저장소 주인은 `.github/workflows/blog-automation.yml`로 **평일 아침 9시 7분마다** 글감 목록에서 하나씩 자동으로 써서 발행할 수 있습니다.

1. 저장소 **Settings → Secrets and variables → Actions** 에 `ANTHROPIC_API_KEY`, (선택) `WP_URL`, `WP_USERNAME`, `WP_APP_PASSWORD`, `BLOG_WEBHOOK_URL` 등록
2. (선택) Variables에 `BLOG_PROVIDER`(`claude`/`ollama`), `CLAUDE_MODEL`, `OLLAMA_MODEL`
3. **Actions → Blog automation → Run workflow** 로 바로 실행도 가능. 결과 글과 `topics.md`는 자동 커밋

블로그 성격은 `blog.config.json`에서 정합니다(프로그램 화면의 설정은 각자 컴퓨터에만 적용).

`blog-automation/`이 기본 브랜치에 바뀌면 `.github/workflows/blog-app-package.yml`이 친구용 `blog-app.zip`을 다시 만들어 Releases에 올립니다.

### 명령줄로 쓰기

```bash
npm install
npm start                                   # 프로그램 화면
npm run generate                            # 글감 목록 맨 위 주제로 한 편
npm run generate -- --provider ollama --topic "가을 사진 찍는 법" --no-publish
npm run typecheck && npm test
```

환경 변수(`ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `OLLAMA_HOST`, `OLLAMA_MODEL`, `WP_URL`, `WP_USERNAME`, `WP_APP_PASSWORD`, `BLOG_WEBHOOK_URL`, `BLOG_PROVIDER`)도 읽으며, 화면에서 저장한 `settings.json`이 우선합니다.
