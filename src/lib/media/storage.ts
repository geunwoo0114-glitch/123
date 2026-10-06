import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * 스토리지 추상화. 지금은 로컬 디스크를 쓰지만 S3/R2 등으로 바꿀 때 이 모듈만 교체한다.
 * key는 서버가 생성한 값만 사용하며(경로 조작 방지) 형식을 엄격히 검사한다.
 */
const KEY_PATTERN = /^\d{4}\/\d{2}\/[a-zA-Z0-9_-]{16,64}\.webp$/;

function root() {
  // 업로드 디렉터리는 런타임 설정이므로 빌드 파일 추적에서 제외한다
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./storage/uploads");
}

export function isValidKey(key: string) {
  return KEY_PATTERN.test(key);
}

function resolveKey(key: string) {
  if (!isValidKey(key)) throw new Error("invalid storage key");
  const full = path.join(/*turbopackIgnore: true*/ root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("invalid storage key");
  return full;
}

export const storage = {
  async put(key: string, data: Buffer) {
    const full = resolveKey(key);
    await mkdir(/*turbopackIgnore: true*/ path.dirname(full), { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ full, data);
  },
  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(/*turbopackIgnore: true*/ resolveKey(key));
    } catch {
      return null;
    }
  },
  async remove(key: string) {
    await unlink(/*turbopackIgnore: true*/ resolveKey(key)).catch(() => undefined);
  },
};

