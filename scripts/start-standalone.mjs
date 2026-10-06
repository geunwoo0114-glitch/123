// standalone 빌드 실행: 정적 파일(public, .next/static)을 복사한 뒤 server.js 실행.
// 로컬에서는 .env를 읽고, 컨테이너/CI에서는 환경 변수를 그대로 쓴다.
import { cpSync, existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const dir = ".next/standalone";
if (!existsSync(`${dir}/server.js`)) {
  console.error("standalone 빌드가 없어요. 먼저 `npm run build`를 실행해 주세요.");
  process.exit(1);
}
cpSync("public", `${dir}/public`, { recursive: true });
cpSync(".next/static", `${dir}/.next/static`, { recursive: true });

const env = { ...process.env };
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2];
  }
}
env.UPLOAD_DIR ??= `${process.cwd()}/storage/uploads`;
if (!env.UPLOAD_DIR.startsWith("/")) env.UPLOAD_DIR = `${process.cwd()}/${env.UPLOAD_DIR}`;

spawn(process.execPath, ["server.js"], { cwd: dir, env, stdio: "inherit" }).on("exit", (code) => process.exit(code ?? 0));
