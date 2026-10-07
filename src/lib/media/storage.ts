import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";

/**
 * 스토리지 추상화.
 * - STORAGE_DRIVER=s3 : S3 호환 오브젝트 스토리지 (AWS S3, Cloudflare R2, MinIO 등)
 * - STORAGE_DRIVER=db : PostgreSQL (디스크가 없는 무료 호스팅용. 사진이 많아지면 s3로 옮긴다)
 * - 그 외(기본)       : 로컬 디스크 (UPLOAD_DIR)
 * key는 서버가 생성한 값만 사용하며(경로 조작 방지) 형식을 엄격히 검사한다.
 * 이미지는 항상 /media 라우트를 거쳐 제공되므로(공개 범위 검사) 버킷은 비공개로 둔다.
 */
const KEY_PATTERN = /^\d{4}\/\d{2}\/[a-zA-Z0-9_-]{16,64}\.webp$/;

export function isValidKey(key: string) {
  return KEY_PATTERN.test(key);
}

type Driver = {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
};

function localDriver(): Driver {
  // 업로드 디렉터리는 런타임 설정이므로 빌드 파일 추적에서 제외한다
  const root = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./storage/uploads");
  const resolveKey = (key: string) => {
    if (!isValidKey(key)) throw new Error("invalid storage key");
    const full = path.join(/*turbopackIgnore: true*/ root(), key);
    if (!full.startsWith(root() + path.sep)) throw new Error("invalid storage key");
    return full;
  };
  return {
    async put(key, data) {
      const full = resolveKey(key);
      await mkdir(/*turbopackIgnore: true*/ path.dirname(full), { recursive: true });
      await writeFile(/*turbopackIgnore: true*/ full, data);
    },
    async get(key) {
      try {
        return await readFile(/*turbopackIgnore: true*/ resolveKey(key));
      } catch {
        return null;
      }
    },
    async remove(key) {
      await unlink(/*turbopackIgnore: true*/ resolveKey(key)).catch(() => undefined);
    },
  };
}

function s3Driver(): Driver {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("STORAGE_DRIVER=s3 이지만 S3_BUCKET이 없어요");
  const client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "1",
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined,
  });
  const check = (key: string) => {
    if (!isValidKey(key)) throw new Error("invalid storage key");
  };
  return {
    async put(key, data) {
      check(key);
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: "image/webp", CacheControl: "private, max-age=31536000, immutable" }));
    },
    async get(key) {
      check(key);
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
      } catch {
        return null;
      }
    },
    async remove(key) {
      check(key);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => undefined);
    },
  };
}

function dbDriver(): Driver {
  const check = (key: string) => {
    if (!isValidKey(key)) throw new Error("invalid storage key");
  };
  return {
    async put(key, data) {
      check(key);
      await db.mediaBlob.upsert({ where: { key }, create: { key, data: new Uint8Array(data) }, update: { data: new Uint8Array(data) } });
    },
    async get(key) {
      check(key);
      const row = await db.mediaBlob.findUnique({ where: { key }, select: { data: true } });
      return row ? Buffer.from(row.data) : null;
    },
    async remove(key) {
      check(key);
      await db.mediaBlob.deleteMany({ where: { key } });
    },
  };
}

let driver: Driver | null = null;
function current(): Driver {
  const kind = process.env.STORAGE_DRIVER;
  driver ??= kind === "s3" ? s3Driver() : kind === "db" ? dbDriver() : localDriver();
  return driver;
}

export const storage: Driver = {
  put: (key, data) => current().put(key, data),
  get: (key) => current().get(key),
  remove: (key) => current().remove(key),
};
