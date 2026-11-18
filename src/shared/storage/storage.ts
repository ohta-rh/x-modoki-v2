import 'server-only';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/shared/config';

/**
 * One client per call: it holds no connection, and no state may live across requests on Workers
 * (ADR-0017). `WHEN_REQUIRED` keeps the SDK from signing a checksum of an empty body, which makes
 * every browser PUT fail on Garage (docs/research/garage-presigned-upload.md 3.1).
 */
function client() {
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}

/**
 * A URL the browser can PUT one object to for 60 seconds. The type and the exact size are part of
 * the signature, so a different body is refused (threat model T-08).
 */
export async function presignUpload(input: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });
  return getSignedUrl(client(), command, { expiresIn: 60 });
}

/** The first `length` bytes of an object (a ranged GET), or null when there is no such object. */
export async function readHead(key: string, length: number): Promise<Uint8Array | null> {
  try {
    const result = await client().send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Range: `bytes=0-${length - 1}` }),
    );
    return await result.Body!.transformToByteArray();
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

/** Deletes an object; deleting one that does not exist is not an error. */
export async function removeObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
