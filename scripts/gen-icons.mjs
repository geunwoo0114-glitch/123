// 앱 아이콘 PNG 생성 (public/icon.svg 기준). 실행: node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/icon.svg");
const out = "public/icons";
for (const size of [192, 512]) await sharp(svg, { density: 512 }).resize(size, size).png().toFile(`${out}/icon-${size}.png`);
await sharp(svg, { density: 512 }).resize(180, 180).png().toFile(`${out}/apple-touch-icon.png`);

// maskable: 안전 영역(80%) 안에 들어가도록 여백 추가
const inner = await sharp(svg, { density: 512 }).resize(380, 380).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#f6f3ee" } })
  .composite([{ input: inner, left: 66, top: 66 }])
  .png()
  .toFile(`${out}/maskable-512.png`);

// 안드로이드 상태바 배지: 흰색 실루엣
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M10 31 32 12l22 19v19a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5Z" fill="#fff"/></svg>`;
await sharp(Buffer.from(badge)).resize(72, 72).png().toFile(`${out}/badge-72.png`);
console.log("icons generated");
