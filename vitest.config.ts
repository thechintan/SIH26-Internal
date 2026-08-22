import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    globals: true,
    include: ['lib/**/__tests__/**/*.test.ts'],
    coverage: {
      include: ['lib/engine/**/*.ts'],
      exclude: ['lib/engine/__tests__/**', 'lib/engine/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});

