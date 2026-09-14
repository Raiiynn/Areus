/**
 * Stand-in for the `server-only` package during tests.
 *
 * `server-only` deliberately throws unless resolved through React's
 * "react-server" export condition, which Vitest does not provide. Aliasing it
 * here lets the server modules it guards be unit-tested directly, while the
 * real guard still protects the application build.
 */
export {}
