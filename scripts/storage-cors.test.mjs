import { describe, expect, it, vi } from 'vitest';
import { corsConfiguration, LOCAL_ORIGINS } from './lib/storage-cors.mjs';

describe('corsConfiguration（#25: ブラウザから署名つき URL へ PUT する）', () => {
  it('ローカルのアプリ（開発 3000、画面のテスト 3300）からの PUT と GET だけを許す', () => {
    expect(LOCAL_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3300']);
    expect(corsConfiguration(LOCAL_ORIGINS)).toEqual({
      CORSRules: [
        {
          AllowedOrigins: ['http://localhost:3000', 'http://localhost:3300'],
          AllowedMethods: ['PUT', 'GET'],
          AllowedHeaders: ['content-type'],
          ExposeHeaders: ['etag'],
          MaxAgeSeconds: 600,
        },
      ],
    });
  });
});

const sent = [];
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send(command) {
      sent.push(command);
      return Promise.resolve({});
    }
  },
  PutBucketCorsCommand: class {
    constructor(input) {
      this.input = input;
    }
  },
}));

describe('scripts/storage-cors.mjs', () => {
  it('.env.local のバケットに、ローカルの CORS の決まりを置く', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await import('./storage-cors.mjs');
    expect(sent).toHaveLength(1);
    expect(sent[0].input).toEqual({
      Bucket: process.env.S3_BUCKET,
      CORSConfiguration: corsConfiguration(LOCAL_ORIGINS),
    });
    expect(log).toHaveBeenCalledWith('storage-cors: http://localhost:3000, http://localhost:3300');
  });
});
