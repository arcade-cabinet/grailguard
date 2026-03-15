import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  define: {
    __DEV__: JSON.stringify(true),
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['src/engine/**/*.ts', 'src/db/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/__mocks__/**'],
      thresholds: {
        branches: 35,
        functions: 60,
        lines: 60,
        statements: 60,
      },
    },
  },
});
