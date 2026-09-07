/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // AREUS uses Prisma, authenticated route handlers, server actions, and a
  // cron endpoint. It must be deployed as a server application, never as a
  // static export.
  output: 'standalone',
  // A build and a dev server cannot share a build directory: `next build`
  // rewrites `.next` underneath a running `next dev`, which then serves 500s
  // until it is restarted. Setting NEXT_DIST_DIR sends a build somewhere else
  // so it can run while the dev server stays up. Unset, nothing changes.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  images: {
    remotePatterns: [
      // Minecraft avatar rendering service used for player heads.
      { protocol: 'https', hostname: 'mc-heads.net' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://mc-heads.net; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          },
        ],
      },
    ]
  },
}

export default nextConfig
