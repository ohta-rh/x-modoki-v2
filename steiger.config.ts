import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Next.js reserves app/ and pages/, so the FSD guide renames the layers to _app/_pages
    // (ADR-0022). Steiger's traversal understands the prefix; only this rule reads it as a typo.
    files: ['./src/_app/**', './src/_pages/**'],
    rules: { 'fsd/typo-in-layer-name': 'off' },
  },
  {
    // A slice used by one other slice is normal while features land one PBI at a time (ADR-0030).
    rules: { 'fsd/insignificant-slice': 'off' },
  },
]);
