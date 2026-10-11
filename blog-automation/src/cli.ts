import { parseArgs } from "node:util";
import { writePost } from "./pipeline.js";
import { publishAll } from "./publishers.js";
import { SettingsSchema } from "./schema.js";
import { loadSettings } from "./settings.js";

const { values } = parseArgs({
  options: {
    provider: { type: "string" },
    topic: { type: "string" },
    "no-publish": { type: "boolean", default: false },
  },
});

async function main() {
  const settings = await loadSettings();
  if (values.provider) settings.provider = SettingsSchema.shape.provider.parse(values.provider);

  console.log(`✍️  [${settings.provider}] 글을 쓰는 중…`);
  const written = await writePost(settings, { topic: values.topic });
  if (!written) {
    console.log("topics.md에 남은 주제가 없습니다. '- [ ] 주제'를 추가하세요.");
    return;
  }
  console.log(`📄 "${written.topic}" → posts/${written.fileName} 저장 (${written.post.markdown.length}자)`);

  if (values["no-publish"]) return;
  const results = await publishAll(written.post, settings);
  if (results.length === 0) console.log("ℹ️  발행 대상이 설정되지 않아 파일로만 저장했습니다.");
  for (const r of results) console.log(`🚀 ${r.target}에 발행${r.url ? `: ${r.url}` : ""}`);
}

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
