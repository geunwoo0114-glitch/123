# 블로그 AI 자동화

주제 목록(`topics.md`)에서 글감을 하나 꺼내 → **Claude** 또는 **로컬 AI(Ollama)** 로 글을 쓰고 →
마크다운 파일로 저장한 뒤 → **WordPress**(또는 웹훅으로 네이버·티스토리·Notion 등)에 발행합니다.
GitHub Actions가 평일 아침마다 자동으로 돌립니다.

```
topics.md ──▶ AI 작성 (Claude / Ollama) ──▶ posts/날짜-slug.md ──▶ WordPress 임시글
   [ ] 주제         JSON 스키마로 검증                  (커밋)            └▶ 웹훅 (Make·Zapier·n8n)
```

## 1. 로컬에서 써 보기

```bash
cd blog-automation
npm install

# Claude
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate

# 로컬 AI (Ollama 설치 후)
ollama pull qwen2.5:7b
npm run generate -- --provider ollama

# 주제를 직접 주고, 발행은 건너뛰기
npm run generate -- --topic "가을 사진 잘 찍는 법" --no-publish
```

결과는 `posts/YYYY-MM-DD-slug.md`에 저장되고, `topics.md`의 해당 주제가 `[x]`로 바뀝니다.

## 2. 설정

| 파일 / 변수 | 설명 |
|---|---|
| `topics.md` | 글감 대기열. `- [ ] 주제`를 줄마다 추가 |
| `blog.config.json` | 블로그 이름·독자·문체·최소 글자 수·추가 지침, WordPress 발행 상태(`draft` 기본)·카테고리 ID |
| `ANTHROPIC_API_KEY` | Claude API 키 |
| `CLAUDE_MODEL` | 기본 `claude-opus-5-5` |
| `OLLAMA_HOST` / `OLLAMA_MODEL` | 기본 `http://127.0.0.1:11434` / `qwen2.5:7b` |
| `WP_URL` / `WP_USERNAME` / `WP_APP_PASSWORD` | WordPress 주소, 사용자, **애플리케이션 비밀번호**(관리자 → 사용자 → 프로필) |
| `BLOG_WEBHOOK_URL` | 글(JSON: title, slug, excerpt, tags, markdown, html)을 POST로 받을 주소 |

발행 대상 변수가 없으면 파일로만 저장합니다. 처음에는 WordPress에 **임시글(draft)** 로 올라가니,
사람이 한 번 읽고 공개하는 흐름을 권장합니다(AI가 사실을 틀릴 수 있습니다).

> 네이버 블로그는 글쓰기 API가 없고 티스토리 Open API는 종료되어 직접 발행할 수 없습니다.
> 웹훅을 Make·Zapier·n8n 시나리오에 연결하거나, 저장된 마크다운을 붙여 넣어 쓰세요.

## 3. GitHub Actions 자동 실행

`.github/workflows/blog-automation.yml`

1. 저장소 **Settings → Secrets and variables → Actions** 에 시크릿 등록:
   `ANTHROPIC_API_KEY`, (선택) `WP_URL`, `WP_USERNAME`, `WP_APP_PASSWORD`, `BLOG_WEBHOOK_URL`
2. (선택) Variables에 `BLOG_PROVIDER`(`claude`/`ollama`), `CLAUDE_MODEL`, `OLLAMA_MODEL`
3. 평일 09:07(KST)에 자동 실행. **Actions → Blog automation → Run workflow** 로 주제·AI를 골라 바로 실행도 가능

`ollama`를 고르면 러너 안에 Ollama를 설치하고 모델을 받아 CPU로 돌립니다(기본 `qwen2.5:3b`,
수 분~수십 분 소요). 내 PC의 GPU로 돌리고 싶다면 self-hosted 러너를 쓰거나 로컬에서 `npm run generate -- --provider ollama`를 실행하세요.

새 글과 갱신된 `topics.md`는 워크플로가 저장소에 자동 커밋합니다.

## 개발

```bash
npm run typecheck
npm test
```
