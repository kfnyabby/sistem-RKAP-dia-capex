import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    env: {
      SESSION_SECRET: 'vitest-test-session-secret-key-32-chars-long',
    },
  },
});
