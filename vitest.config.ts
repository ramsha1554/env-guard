import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90
      }
    }
  }
});
