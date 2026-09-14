import { Bebas_Neue, Manrope } from 'next/font/google'

/**
 * Typefaces for the Vectorline language.
 *
 * Loaded through `next/font`, which downloads the files at build time and
 * serves them from this origin. That is not a preference: the Content-Security
 * -Policy in `next.config.mjs` sets `font-src 'self' data:` and omits Google's
 * CDN from `style-src`, so a `<link>` to fonts.googleapis.com would be blocked
 * and the page would silently fall back to system faces.
 *
 * Both expose a CSS variable rather than a class, so `tokens.css` stays the
 * single place that decides which face is the display face and which is the
 * body face.
 */

/** Display and high-impact data metrics. Single weight, caps only. */
export const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-display-loaded',
})

/** Everything functional: body copy, labels, and dense numeric columns. */
export const manrope = Manrope({
  subsets: ['latin'],
  // 500 for labels, 600/700 for emphasis. Manrope is variable, so these cost
  // nothing extra to request.
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body-loaded',
})
