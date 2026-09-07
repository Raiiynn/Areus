import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Integration tests share one PostgreSQL database, so they must not run
    // concurrently against it.
    fileParallelism: false,
    env: {
      // Point every module that reads DATABASE_URL at the dedicated test
      // database. This is set before any import runs, which matters because the
      // Prisma singleton reads it at module scope.
      // Use a dedicated database, never the development or production one.
      // Override this locally or in CI with a PostgreSQL test connection.
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/areus_test?schema=public',
      DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/areus_test?schema=public',
      SESSION_SECRET: 'test-secret-not-used-for-anything-real',
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // `server-only` throws unless it is resolved through React's
      // "react-server" export condition, which Vitest does not provide. The
      // stub keeps the guard meaningful in the app while letting the services
      // it protects be tested directly.
      {
        find: /^server-only$/,
        replacement: fileURLToPath(
          new URL('./tests/helpers/serverOnlyStub.ts', import.meta.url),
        ),
      },
    ],
  },
})
