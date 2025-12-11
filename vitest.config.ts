import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/*.{test,spec}.ts',
      'packages/**/test/*.e2e.ts',
      'packages/**/test/*.e2e-spec.ts',
    ],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules', 'dist', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
      reportsDirectory: './coverage',
    },
    testTimeout: 10000,
  },
});
