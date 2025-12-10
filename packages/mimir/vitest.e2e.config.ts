import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.e2e.ts'],
    globals: false,
    testTimeout: 30000, // 30 seconds for E2E tests
    hookTimeout: 30000,
    poolOptions: {
      threads: {
        singleThread: true, // E2E tests run sequentially
      },
    },
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:54322/postgres',
    },
  },
});
