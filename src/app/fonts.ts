import { Inter, Space_Grotesk } from 'next/font/google'

/** Self-hosted by Next so the existing font-src policy stays intact. */
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-loaded',
})
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body-loaded',
})
