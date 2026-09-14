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
/**
 * Bind a token to Tailwind so the `/40` opacity modifier actually works.
 *
 * A colour written as the bare string `'var(--accent)'` cannot take an alpha
 * modifier: Tailwind has no channels to reassemble, so it silently emits no
 * rule at all. Every `border-tier-s/50`, `bg-negative/10` and `bg-surface-base/95`
 * in the codebase was therefore dead — which is why tier badges rendered with
 * no colour and the sticky header had no background to blur behind.
 *
 * `color-mix` keeps the tokens as readable hex in `tokens.css` — the
 * alternative, storing them as bare channel triplets, would break every
 * `var(--accent)` used directly in CSS and in inline styles.
 */
const token = (name: string): string => {
  const resolve = ({ opacityValue }: { opacityValue?: string }) => {
    /* Tailwind calls this with three different kinds of `opacityValue`:
       `undefined`, a number when the class carries a `/40` modifier, and the
       string `var(--tw-border-opacity)` for a plain `border-line`. Only the
       numeric case can become a percentage — feeding the others to `Number()`
       produced `NaN%`, which made the whole declaration invalid, so the border
       fell back to `currentColor` and every hairline rendered near-white. */
    if (opacityValue === undefined) return `var(${name})`

    const alpha = Number(opacityValue)
    if (Number.isNaN(alpha)) return `var(${name})`

    return `color-mix(in srgb, var(${name}) ${alpha * 100}%, transparent)`
  }

  /* Tailwind resolves a colour written as a function at build time — this is
     the documented way to make a CSS-variable colour alpha-aware — but its
     published `Config` type only admits a string here. The cast is confined to
     this one line rather than loosening the type of the whole theme. */
  return resolve as unknown as string
}

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      surface: {
        base: token('--surface-base'),
        raised: token('--surface-raised'),
        overlay: token('--surface-overlay'),
        sunken: token('--surface-sunken'),
      },
      line: {
        DEFAULT: token('--line-hairline'),
        strong: token('--line-strong'),
      },
      text: {
        primary: token('--text-primary'),
        secondary: token('--text-secondary'),
        muted: token('--text-muted'),
        inverse: token('--text-inverse'),
      },
      accent: {
        DEFAULT: token('--accent'),
        strong: token('--accent-strong'),
        dim: token('--accent-dim'),
      },
      gold: {
        DEFAULT: token('--gold'),
        strong: token('--gold-strong'),
        dim: token('--gold-dim'),
      },
      positive: token('--positive'),
      negative: token('--negative'),
      warning: token('--warning'),
      info: token('--info'),

      tier: {
        s: token('--tier-s'),
        a: token('--tier-a'),
        b: token('--tier-b'),
        c: token('--tier-c'),
        d: token('--tier-d'),
      },
    },

    /**
     * The ramp is still closed — you cannot type an arbitrary size — but it now
     * contains every step the interface actually uses. Replacing Tailwind's
     * scale without these meant `h-11`, `h-14`, `w-7` and every `.5` step
     * emitted no CSS at all, so a 44px touch target was really a zero-height
     * button and the skeletons collapsed to hairlines. Silent, because Tailwind
     * drops a class it cannot resolve rather than failing the build.
     */
    spacing: {
      0: '0',
      px: '1px',
      0.5: 'var(--space-0_5)',
      1: 'var(--space-1)',
      1.5: 'var(--space-1_5)',
      2: 'var(--space-2)',
      3: 'var(--space-3)',
      4: 'var(--space-4)',
      5: 'var(--space-5)',
      6: 'var(--space-6)',
      7: 'var(--space-7)',
      8: 'var(--space-8)',
      9: 'var(--space-9)',
      10: 'var(--space-10)',
      11: 'var(--space-11)',
      12: 'var(--space-12)',
      14: 'var(--space-14)',
      16: 'var(--space-16)',
      18: 'var(--space-18)',
      20: 'var(--space-20)',
      24: 'var(--space-24)',
      32: 'var(--space-32)',
      40: 'var(--space-40)',
      48: 'var(--space-48)',
      64: 'var(--space-64)',
    },

    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius-md)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
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
      /* 1 is the inset highlight alone — the "carved" look. 2 adds the outer
         shadow that separates a frame from the page. Vectorline rules out
         heavy drop shadows, so there is no step beyond these two. */
      1: 'var(--elevation-1)',
      2: 'var(--elevation-2)',
    },

    letterSpacing: {
      display: 'var(--tracking-display)',
      normal: '0',
      label: 'var(--tracking-label)',
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
      transitionDuration: {
        reveal: 'var(--duration-reveal)',
      },
      backgroundImage: {
        frame: 'var(--frame-gradient)',
        control: 'var(--button-gradient)',
      },
      padding: {
        frame: 'var(--frame-padding)',
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
