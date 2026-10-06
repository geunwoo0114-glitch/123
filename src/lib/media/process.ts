import "server-only";
import sharp, { type Metadata } from "sharp";
import { randomBytes } from "node:crypto";
import { appConfig } from "@/config/app";

export class ImageProcessingError extends Error {}

export type ProcessedImage = {
  key: string;
  thumbKey: string;
  main: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  dominant: string;
};

function newKey(suffix = "") {
  const now = new Date();
  const id = randomBytes(18).toString("base64url");
  return `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}${suffix}.webp`;
}

/**
 * 업로드 이미지를 정규화한다.
 * - MIME 헤더를 믿지 않고 실제 디코딩으로 이미지인지 확인
 * - EXIF 회전 보정 후 메타데이터(위치정보 포함) 제거
 * - 긴 변 기준 리사이즈 + webp 변환, 썸네일 생성, 대표 색상 추출
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const { maxDimension, thumbDimension } = appConfig.upload;
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new ImageProcessingError("이미지 파일을 읽을 수 없어요. JPG, PNG, WEBP 형식을 사용해 주세요.");
  }
  if (!meta.format || !["jpeg", "png", "webp", "gif", "avif", "heif"].includes(meta.format)) {
    throw new ImageProcessingError("지원하지 않는 이미지 형식이에요.");
  }

  try {
    const base = sharp(input, { limitInputPixels: 50_000_000 }).rotate();
    const { data: main, info } = await base
      .clone()
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await base
      .clone()
      .resize({ width: thumbDimension, height: thumbDimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 74 })
      .toBuffer();
    const { dominant } = await sharp(thumb).stats();
    const hex = `#${[dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    const key = newKey();
    return {
      key,
      thumbKey: key.replace(/\.webp$/, "_t.webp"),
      main,
      thumb,
      width: info.width,
      height: info.height,
      dominant: hex,
    };
  } catch {
    throw new ImageProcessingError("이미지를 처리하지 못했어요. 다른 사진으로 시도해 주세요.");
  }
}
