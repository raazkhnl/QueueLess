import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
