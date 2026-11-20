import 'server-only';

// The environment is read and validated on the server only: kept out of index.ts so the client
// bundle never carries the validator (#32).
export { env } from './env';
