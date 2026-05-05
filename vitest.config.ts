import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          globals: true,
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
