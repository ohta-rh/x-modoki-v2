// The bucket's CORS rules for local work (#25): the browser PUTs an image straight to a signed URL
// on the storage host, so storage must allow the app's origin. 3000 is `pnpm dev` / `pnpm start`,
// 3300 the port the e2e and the hands-on checks use.
export const LOCAL_ORIGINS = ['http://localhost:3000', 'http://localhost:3300'];

export function corsConfiguration(origins) {
  return {
    CORSRules: [
      {
        AllowedOrigins: origins,
        AllowedMethods: ['PUT', 'GET'],
        AllowedHeaders: ['content-type'],
        ExposeHeaders: ['etag'],
        MaxAgeSeconds: 600,
      },
    ],
  };
}
