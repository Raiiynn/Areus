import type { Config } from 'tailwindcss'

/**
 * Tailwind is the utility layer only. Every value it can emit maps to a token
 * from MASTER.md via `src/app/tokens.css`.
 *
 * The default palette, spacing ramp and radii are replaced rather than extended
 * on purpose: leaving `bg-indigo-500` and `rounded-lg` reachable is exactly how
 * a codebase drifts into the generic Tailwind look FULL_BUILD §1712 rules out.
 * If a class does not exist, the wrong colour cannot be typed by accident.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      surface: {
        base: 'var(--surface-base)',
        raised: 'var(--surface-raised)',
        overlay: 'var(--surface-overlay)',
        sunken: 'var(--surface-sunken)',
      },
      line: {
        DEFAULT: 'var(--line-hairline)',
        strong: 'var(--line-strong)',
      },
      text: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        inverse: 'var(--text-inverse)',
      },
      accent: {
        DEFAULT: 'var(--accent)',
        strong: 'var(--accent-strong)',
        dim: 'var(--accent-dim)',
      },
      gold: {
        DEFAULT: 'var(--gold)',
        strong: 'var(--gold-strong)',
        dim: 'var(--gold-dim)',
      },
      positive: 'var(--positive)',
      negative: 'var(--negative)',
      warning: 'var(--warning)',
      info: 'var(--info)',

      tier: {
        s: 'var(--tier-s)',
        a: 'var(--tier-a)',
        b: 'var(--tier-b)',
        c: 'var(--tier-c)',
        d: 'var(--tier-d)',
      },
    },

    spacing: {
      0: '0',
      px: '1px',
      1: 'var(--space-1)',
      2: 'var(--space-2)',
      3: 'var(--space-3)',
      4: 'var(--space-4)',
      5: 'var(--space-5)',
      6: 'var(--space-6)',
      8: 'var(--space-8)',
      10: 'var(--space-10)',
      12: 'var(--space-12)',
      16: 'var(--space-16)',
      20: 'var(--space-20)',
      24: 'var(--space-24)',
    },

    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius-md)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      full: 'var(--radius-full)',
    },

    fontFamily: {
      display: 'var(--font-display)',
      body: 'var(--font-body)',
      mono: 'var(--font-mono)',
    },

    fontSize: {
      '2xs': 'var(--text-2xs)',
      xs: 'var(--text-xs)',
      sm: 'var(--text-sm)',
      base: 'var(--text-base)',
      lg: 'var(--text-lg)',
      xl: 'var(--text-xl)',
      '2xl': 'var(--text-2xl)',
      '3xl': 'var(--text-3xl)',
      '4xl': 'var(--text-4xl)',
      hero: 'var(--text-hero)',
    },

    boxShadow: {
      none: 'var(--elevation-0)',
      1: 'var(--elevation-1)',
      2: 'var(--elevation-2)',
    },

    transitionDuration: {
      instant: 'var(--duration-instant)',
      fast: 'var(--duration-fast)',
      base: 'var(--duration-base)',
      slow: 'var(--duration-slow)',
    },

    transitionTimingFunction: {
      out: 'var(--ease-out)',
      in: 'var(--ease-in)',
      'in-out': 'var(--ease-in-out)',
    },

    extend: {
      maxWidth: {
        content: 'var(--width-content)',
        prose: 'var(--width-prose)',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
}

export default config
