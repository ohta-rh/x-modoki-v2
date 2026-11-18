// Vitest runs without globals, so React Testing Library cannot register its own cleanup.
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Data access code calls getDb(); in tests it reaches the worker's own database (ADR-0031).
// The real getDb() is tested in src/shared/db/client.test.ts through vi.importActual.
vi.mock('@/shared/db/client', async () => ({ getDb: (await import('./db')).testDb }));
