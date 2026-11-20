// Sets the local bucket's CORS rules (run by scripts/setup-local.sh after the bucket exists).
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';
import { corsConfiguration, LOCAL_ORIGINS } from './lib/storage-cors.mjs';

process.loadEnvFile('.env.local');
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});
await client.send(
  new PutBucketCorsCommand({
    Bucket: process.env.S3_BUCKET,
    CORSConfiguration: corsConfiguration(LOCAL_ORIGINS),
  }),
);
console.log(`storage-cors: ${LOCAL_ORIGINS.join(', ')}`);
