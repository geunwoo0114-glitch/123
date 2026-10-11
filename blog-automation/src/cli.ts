import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { normalizeSlug, seoulDate, toMarkdownFile } from "./post-file.js";
import { generate, type ProviderName } from "./providers.js";
import { publishToWebhook, publishToWordPress } from "./publishers.js";
import { ConfigSchema } from "./schema.js";
import { markDone, nextTopic } from "./topics.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { values } = parseArgs({
  options: {
    provider: { type: "string", default: process.env.BLOG_PROVIDER ?? "claude" },
    topic: { type: "string" },
    "no-publish": { type: "boolean", default: false },
  },
});

async function main() {
  const provider = values.provider as ProviderName;
  if (provider !== "claude" && provider !== "ollama") {
    throw new Error(`--provider는 claude 또는 ollama만 됩니다: ${values.provider}`);
  }

  const config = ConfigSchema.parse(JSON.parse(await readFile(path.join(root, "blog.config.json"), "utf8")));
  const topicsPath = path.join(root, "topics.md");
  const topicsMd = existsSync(topicsPath) ? await readFile(topicsPath, "utf8") : "";

  const topic = values.topic ?? nextTopic(topicsMd);
  if (!topic) {
    console.log("topics.md에 남은 주제가 없습니다. '- [ ] 주제'를 추가하세요.");
    return;
  }

  console.log(`✍️  [${provider}] "${topic}" 글을 쓰는 중…`);
  const post = await generate(provider, {
    system: buildSystemPrompt(config),
    user: buildUserPrompt(topic),
  });

  const date = seoulDate();
  post.slug = normalizeSlug(post.slug, `post-${Date.now()}`);
  const fileName = `${date}-${post.slug}.md`;
  await mkdir(path.join(root, "posts"), { recursive: true });
  await writeFile(path.join(root, "posts", fileName), toMarkdownFile(post, { date, provider, topic }));
  console.log(`📄 posts/${fileName} 저장 (${post.markdown.length}자)`);

  if (!values.topic) await writeFile(topicsPath, markDone(topicsMd, topic, fileName));

  if (values["no-publish"]) return;
  const results = [await publishToWordPress(post, config), await publishToWebhook(post)].filter((r) => r !== null);
  if (results.length === 0) console.log("ℹ️  발행 대상이 설정되지 않아 파일로만 저장했습니다.");
  for (const r of results) console.log(`🚀 ${r.target}에 발행${r.url ? `: ${r.url}` : ""}`);
}

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
