import "server-only";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpError } from "./server";
export const fileTypes: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp"],
  receipt: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  resource: [
    "application/pdf",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  rule: ["application/pdf"],
};
export const maxSize = (purpose: string) =>
  purpose === "receipt"
    ? 5 * 1024 * 1024
    : purpose === "image"
      ? 10 * 1024 * 1024
      : 25 * 1024 * 1024;
export function storage() {
  for (const name of [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ])
    if (!process.env[name])
      throw new HttpError(503, "File storage has not been connected yet.");
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}
export async function uploadUrl(key: string, mime: string) {
  return getSignedUrl(
    storage(),
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: mime,
    }),
    { expiresIn: 300 },
  );
}
export function magicMatches(mime: string, b: Uint8Array) {
  const h = Buffer.from(b);
  if (mime === "application/pdf")
    return h.subarray(0, 5).toString() === "%PDF-";
  if (mime === "image/png")
    return h
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg")
    return h[0] === 255 && h[1] === 216 && h[2] === 255;
  if (mime === "image/webp")
    return (
      h.subarray(0, 4).toString() === "RIFF" &&
      h.subarray(8, 12).toString() === "WEBP"
    );
  return h[0] === 80 && h[1] === 75 && h[2] === 3 && h[3] === 4;
}
export async function verifyObject(file: {
  object_key: string;
  mime: string;
  size_bytes: number;
  purpose: string;
}) {
  const s = storage(),
    o = { Bucket: process.env.R2_BUCKET_NAME!, Key: file.object_key };
  const head = await s.send(new HeadObjectCommand(o));
  if (
    head.ContentLength !== file.size_bytes ||
    head.ContentLength > maxSize(file.purpose) ||
    head.ContentType !== file.mime
  ) {
    await s.send(new DeleteObjectCommand(o));
    throw new HttpError(400, "File size or type did not match the upload.");
  }
  const bytes = await s.send(
    new GetObjectCommand({ ...o, Range: "bytes=0-31" }),
  );
  if (
    !bytes.Body ||
    !magicMatches(file.mime, await bytes.Body.transformToByteArray())
  ) {
    await s.send(new DeleteObjectCommand(o));
    throw new HttpError(400, "The file contents do not match its file type.");
  }
}
export async function downloadUrl(
  file: { object_key: string; filename: string; mime: string },
  inline = false,
) {
  const filename = file.filename
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .slice(0, 150);
  return getSignedUrl(
    storage(),
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: file.object_key,
      ResponseContentType: file.mime,
      ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename="${filename}"`,
    }),
    { expiresIn: 120 },
  );
}
