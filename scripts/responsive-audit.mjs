/**
 * Static responsive-risk audit.
 *
 * WHAT THIS IS: a scan of the source for the layout patterns that actually
 * cause horizontal overflow and cramped mobile layouts — fixed pixel widths,
 * tables without a scroll container, viewport-blocking meta tags, grids that
 * never collapse to one column, and touch targets below 44px.
 *
 * WHAT THIS IS NOT: a substitute for opening the pages at 320px through 1920px
 * and looking at them. No browser automation is available in this environment
 * (docs/ARCHITECTURE_AUDIT.md §6), so nothing here proves a page *looks* right
 * — only that it avoids the mechanical causes of the failures FULL_BUILD §27
 * enumerates. A human still needs to run the viewport pass.
 *
 * Usage: node scripts/responsive-audit.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.join(process.cwd(), 'src')

const findings = []
let filesScanned = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full)
    } else if (/\.tsx?$/.test(entry)) {
      scan(full)
    }
  }
}

function record(file, line, severity, rule, detail) {
  findings.push({
    file: path.relative(process.cwd(), file),
    line,
    severity,
    rule,
    detail,
  })
}

function scan(file) {
  filesScanned += 1
  const source = readFileSync(file, 'utf8')
  const lines = source.split('\n')

  lines.forEach((text, index) => {
    const lineNo = index + 1

    // An explicit `responsive-ok:` marker on the line, or within the two lines
    // above it, waives the check. It must carry a reason — the point is that
    // the decision is recorded where it was made rather than suppressed
    // globally, so the next person can re-judge it.
    const nearby = lines.slice(Math.max(0, index - 2), index + 1).join('\n')
    if (/responsive-ok:\s*\S+/.test(nearby)) return

    // Fixed pixel widths in class names are the classic overflow cause: an
    // element wider than a 320px viewport pushes the whole page sideways.
    const fixedWidth = text.match(/\bw-\[(\d+)px\]/g)
    if (fixedWidth) {
      for (const match of fixedWidth) {
        const px = Number(match.match(/(\d+)/)[1])
        if (px > 300) {
          record(file, lineNo, 'high', 'fixed-width', `${match} exceeds a 320px viewport`)
        }
      }
    }

    // A min-width wider than the smallest supported viewport cannot shrink.
    const minWidth = text.match(/\bmin-w-\[(\d+)px\]/g)
    if (minWidth) {
      for (const match of minWidth) {
        const px = Number(match.match(/(\d+)/)[1])
        if (px > 300) {
          record(file, lineNo, 'high', 'min-width', `${match} cannot fit a 320px viewport`)
        }
      }
    }

    // Blocking zoom fails WCAG 1.4.4.
    if (/maximumScale:\s*1\b/.test(text) || /user-scalable=no/.test(text)) {
      record(file, lineNo, 'high', 'zoom-blocked', 'viewport prevents zooming')
    }

    // Horizontal scroll on the page body rather than inside a container.
    if (/overflow-x-(auto|scroll)/.test(text) && /\bbody\b/.test(text)) {
      record(file, lineNo, 'medium', 'body-scroll', 'body should not scroll horizontally')
    }

    // A table without a scroll container overflows on narrow screens.
    if (/<table/.test(text)) {
      const context = lines.slice(Math.max(0, index - 6), index).join('\n')
      if (!/overflow-x-auto|hidden md:block|md:block/.test(context)) {
        record(
          file,
          lineNo,
          'high',
          'table-overflow',
          'table has no scroll container or desktop-only guard above it',
        )
      }
    }

    // Multi-column grids that never state a single-column base.
    const gridCols = text.match(/(?:^|\s)grid-cols-(\d+)/)
    if (gridCols && Number(gridCols[1]) > 1) {
      if (!/\b(sm|md|lg|xl):grid-cols-/.test(text)) {
        record(
          file,
          lineNo,
          'medium',
          'unresponsive-grid',
          `grid-cols-${gridCols[1]} with no breakpoint prefix — stays multi-column at 320px`,
        )
      }
    }

    // Touch targets. h-8 is 32px; acceptable only in dense table rows where an
    // alternative path to the action exists.
    if (/\bh-(6|7|8)\b/.test(text) && /<button|<Button|role="button"/.test(text)) {
      record(file, lineNo, 'low', 'touch-target', 'interactive element below 44px')
    }

    // whitespace-nowrap on long content prevents wrapping and overflows.
    if (/whitespace-nowrap/.test(text) && !/truncate|overflow/.test(text)) {
      record(file, lineNo, 'low', 'nowrap', 'nowrap without truncate can overflow')
    }
  })
}

walk(ROOT)

// --- Positive checks: the patterns that should be present -------------------

const positives = []

function assertPresent(label, file, pattern) {
  const full = path.join(process.cwd(), file)
  try {
    const source = readFileSync(full, 'utf8')
    positives.push({ label, ok: pattern.test(source), file })
  } catch {
    positives.push({ label, ok: false, file, missing: true })
  }
}

assertPresent(
  'body prevents horizontal page scroll',
  'src/app/globals.css',
  /overflow-x:\s*hidden/,
)
assertPresent(
  'reduced motion collapses durations',
  'src/app/tokens.css',
  /prefers-reduced-motion:\s*reduce/,
)
assertPresent(
  'viewport allows zoom to at least 5x',
  'src/app/layout.tsx',
  /maximumScale:\s*5/,
)
assertPresent(
  'focus is always visible',
  'src/app/globals.css',
  /:focus-visible/,
)
assertPresent(
  'leaderboard has a separate mobile layout',
  'src/components/domain/LeaderboardTable.tsx',
  /md:hidden/,
)
assertPresent(
  'header collapses to a drawer below md',
  'src/components/layout/SiteHeader.tsx',
  /md:hidden/,
)
assertPresent(
  'fluid type scale',
  'src/app/tokens.css',
  /clamp\(/,
)

// --- Report -----------------------------------------------------------------

const bySeverity = { high: [], medium: [], low: [] }
for (const finding of findings) bySeverity[finding.severity].push(finding)

console.log(`Scanned ${filesScanned} files under src/\n`)

console.log('Required patterns:')
let positiveFailures = 0
for (const check of positives) {
  console.log(`  ${check.ok ? 'PASS' : 'FAIL'}  ${check.label}`)
  if (!check.ok) positiveFailures += 1
}

console.log('\nRisk findings:')
for (const severity of ['high', 'medium', 'low']) {
  const list = bySeverity[severity]
  if (list.length === 0) {
    console.log(`  ${severity}: none`)
    continue
  }
  console.log(`  ${severity}: ${list.length}`)
  for (const f of list) {
    console.log(`    ${f.file}:${f.line}  [${f.rule}] ${f.detail}`)
  }
}

console.log('\n---')
console.log(
  `high=${bySeverity.high.length} medium=${bySeverity.medium.length} ` +
    `low=${bySeverity.low.length} required-pattern-failures=${positiveFailures}`,
)
console.log(
  'NOTE: static analysis only. It does not prove any page renders correctly.\n' +
    'A manual viewport pass at 320/360/375/390/414/768/1024/1280/1440/1920 is\n' +
    'still required before calling responsive QA complete.',
)

process.exit(bySeverity.high.length > 0 || positiveFailures > 0 ? 1 : 0)
