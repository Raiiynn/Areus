# SMP verification — 2026-10-14

Status: frontend implemented and reviewable; live integration and release sign-off remain pending.
Branch: `codex/hardcore-smp`. No commit, push, deployment or schema migration performed.

## Results

| Check | Result |
|---|---|
| Lint | PASS: npm run lint |
| TypeScript | PASS: npm run typecheck |
| Next production build | PASS with existing generated Prisma client, NEXT_DIST_DIR=.next-smp-release |
| Fresh Prisma generation | FAIL baseline: Windows EPERM engine rename; not bypassed as a deployment gate |
| New SMP + metadata tests | PASS: 26/26 across hardcore, hardcoreViews and playerMetadata |
| Last full suite | 119 passed, 85 skipped; six integration suites failed during test database setup. Five additional metadata regression tests then passed in the targeted 26-test run. |
| Responsive static audit | PASS: no high, medium or low findings |
| Browser viewport measurements | PASS homepage at 320/360/375/390/414/768/1024/1280/1440/1920; no main descendants outside viewport |
| Public page navigation | PASS all eight main pages at 320px, one h1 each and no page-width overflow |
| Interaction checks | PASS mobile menu, Enter/Escape, focus restoration, ranking category/search, faction ranking tab |
| Browser console | No captured errors during public-page checks |
| HTTP smoke check | All eight primary routes return 200. Missing details render the Next not-found state; root loading streams can commit 200 before notFound runs. |
| Contrast samples | Secondary text/card 5.99:1; primary/card 14.01:1; button text/blue 5.20:1; input border/card 3.22:1; focus/card 4.17:1 |
| Screen reader / axe / zoom | Not verified; no full WCAG conformance claim |

Build retry notes: an intermediate output directory hit Windows EBUSY during export cleanup.
A fresh separate output and the subsequent final build both succeeded. The successful
Next build does not prove clean Prisma generation, full authentication integration,
or a configured live Minecraft service. Standard `npm run build` is still the deployment command.

## Self review

- Kept existing logo, sessions, role controls, Discord actions, PvP data and routes.
- Kept previous rules at /rules/pvp; new public navigation has eight requested entries.
- Kept public records separate from old PvP match results and website account names.
- Corrected a clipped season label, heading hierarchy, stronger input borders,
  mobile hero contrast and deterministic faction ordering during review.
- Added separate faction total so a future paginated roster cannot undercount factions.
- Tested missing/invalid ranking metrics, deathless K/D, empty controls, UUID links,
  XSS escaping and profile metadata visibility. No existing test was weakened.
- Updated Vitest JSX transform to match Next's automatic runtime for view tests.
- Domain has no framework/ORM imports; server source remains unavailable by design.
- No live cooldown, active feature status, faction wars, territories or players invented.
- Current frontend lists paginate bounded snapshots. A live adapter must query/page
  in PostgreSQL before large production datasets are enabled.
- Unknown entity pages do not invent records. Next's streaming loading boundary
  means not-found content is not a guarantee of HTTP 404 after headers are sent.

## Changed areas

- src/app: homepage, layout/fonts/tokens/CSS, loading, players/profiles, rules;
  new minecraft, leaderboard, factions/details, events/details, community routes.
- src/components/hardcore: portal panels/stats/notices, survival leaderboard,
  faction directory/ranking table, player profile and scheduled event countdown.
- src/components/layout: header/footer use shared public navigation.
- src/domain: public SMP DTOs, survival filters, proposed faction score, navigation.
- src/services/hardcore.ts: server-only unavailable read model.
- public/hardcore-landscape.svg: local original voxel illustration.
- tests: 26 new domain, view contract and metadata regression tests.
- vitest.config.ts: automatic JSX transform; responsive audit breakpoint updated to xl.
- docs: scoped audit/spec, ADR, integration recommendations, architecture, design,
  API/database/security/deployment notes and changelog. Root PROJECT_CONTEXT updated.

Pre-existing untracked AGENTS.md, MASTER_PROMPT.md, docs/ARCHITECTURE_AUDIT.md and
other user documents were not removed or staged. Generated build output stays ignored.

## Remaining integration and release work

1. Confirm season, enabled mechanics, public visibility, UUID links, Discord invite
   and faction scoring with the actual server configuration and owner.
2. Implement additive entities and authenticated idempotent plugin ingestion as
   specified in SMP_INTEGRATION.md; preserve production data during rollout.
3. Replace the unavailable service with bounded, allow-listed database projections.
4. Restore the isolated PostgreSQL test database and re-run the full auth/integration suite.
5. Resolve the Windows Prisma engine lock or verify clean generation in deployment CI.
6. Complete populated-data browser testing, screen-reader, axe and zoom verification.

The checklists below use PASS only for evidence in this scope; FAIL means an
applicable gate remains unverified or blocked, not necessarily a discovered
vulnerability. N/A identifies unchanged controls or features not introduced here.

## FEATURE_CHECKLIST.md — item-by-item


### Requirements

- Every acceptance criterion in the spec is met: **FAIL** — not fully verified; see limitations and remaining work above.
- Nothing outside the agreed scope was added: **PASS** — scoped source review, tests or browser evidence listed above.
- Assumptions made are written down in the summary: **PASS** — scoped source review, tests or browser evidence listed above.
- Open questions are resolved or explicitly flagged: **PASS** — scoped source review, tests or browser evidence listed above.

### Correctness

- Happy path works end to end: **FAIL** — not fully verified; see limitations and remaining work above.
- Empty input and empty result handled: **PASS** — scoped source review, tests or browser evidence listed above.
- Boundary values handled: zero, one, maximum: **PASS** — scoped source review, tests or browser evidence listed above.
- Very long and unicode input handled: **PASS** — scoped source review, tests or browser evidence listed above.
- Concurrent modification handled: **N/A** — no new persistence mutation, migration, transactional flow or performance budget.
- No unhandled promise rejection or swallowed error: **PASS** — scoped source review, tests or browser evidence listed above.

### Code quality

- Follows the conventions of the files it touches: **PASS** — scoped source review, tests or browser evidence listed above.
- No duplicated logic that an existing helper already covers: **PASS** — scoped source review, tests or browser evidence listed above.
- No dead code, commented-out code, or debug output left behind: **PASS** — scoped source review, tests or browser evidence listed above.
- No magic values: **PASS** — scoped source review, tests or browser evidence listed above.
- No unowned TODO markers: **PASS** — scoped source review, tests or browser evidence listed above.
- Names state intent: **PASS** — scoped source review, tests or browser evidence listed above.

### Architecture

- Fits the existing boundaries; no layer violation introduced: **PASS** — scoped source review, tests or browser evidence listed above.
- Dependencies point inward: **PASS** — scoped source review, tests or browser evidence listed above.
- No circular dependency introduced: **PASS** — scoped source review, tests or browser evidence listed above.
- Structural decisions recorded as an ADR: **PASS** — scoped source review, tests or browser evidence listed above.

### Validation

- Every input validated server-side at the boundary: **PASS** — server query parsing/category allow-list, exact record lookup, safe empty/not-found behavior.
- Unknown fields rejected: **N/A** — no new mutation/ingestion API; unused query fields are not forwarded.
- Validation messages are actionable and leak nothing: **PASS** — server query parsing/category allow-list, exact record lookup, safe empty/not-found behavior.

### Security

- Authentication required where it should be: **PASS** — new routes are public; existing private gates retained; profile visibility has regression coverage.
- Authorization enforced server-side, at object level: **PASS** — new routes are public; existing private gates retained; profile visibility has regression coverage.
- Queries parameterized: **PASS** — scoped source review, tests or browser evidence listed above.
- Output encoded at the point of rendering: **PASS** — scoped source review, tests or browser evidence listed above.
- No secret in source, fixtures, logs, or the client bundle: **PASS** — changed public DTOs contain no connection or credential fields; no frontend environment variable added.
- Errors disclose nothing internal: **PASS** — scoped source review, tests or browser evidence listed above.
- `SECURITY_CHECKLIST.md` run if auth, input, or personal data is touched: **PASS** — this report, self review and updated changelog.

### Data

- Migration has a rollback: **N/A** — no new persistence mutation, migration, transactional flow or performance budget.
- Indexes exist for new filter, sort, and join columns: **N/A** — no new persistence mutation, migration, transactional flow or performance budget.
- No unbounded query: **FAIL** — not fully verified; see limitations and remaining work above.
- Transaction boundaries correct: **N/A** — no new persistence mutation, migration, transactional flow or performance budget.

### UI

- Loading state: **PASS** — scoped source review, tests or browser evidence listed above.
- Empty state, and it is actionable: **PASS** — scoped source review, tests or browser evidence listed above.
- Error state, with a way to recover: **PASS** — existing Next error boundary retains retry/home recovery.
- Success feedback: **N/A** — no new persistence mutation, migration, transactional flow or performance budget.
- Disabled state, with the reason communicated: **PASS** — scoped source review, tests or browser evidence listed above.
- Unauthorized state: **PASS** — new routes are public; existing private gates retained; profile visibility has regression coverage.
- Responsive at the smallest supported viewport: **PASS** — scoped source review, tests or browser evidence listed above.
- Uses design tokens; no hardcoded color, spacing, or font size: **PASS** — scoped source review, tests or browser evidence listed above.
- `ACCESSIBILITY_CHECKLIST.md` run: **PASS** — this report, self review and updated changelog.

### Performance

- No N+1 query introduced: **PASS** — scoped source review, tests or browser evidence listed above.
- Lists paginated at the database: **PASS** — existing account query is database-paginated; SMP service returns no rows. Live adapter pagination remains required.
- Measured against the budget if the spec set one: **N/A** — no new persistence mutation, migration, transactional flow or performance budget.

### Tests

- Happy path covered: **PASS** — scoped source review, tests or browser evidence listed above.
- Edge cases covered: **PASS** — scoped source review, tests or browser evidence listed above.
- Failure modes covered: **PASS** — scoped source review, tests or browser evidence listed above.
- Authorization cases covered: **FAIL** — metadata visibility covered; full existing authorization suite blocked at database setup.
- No existing test was changed to accommodate this work: **PASS** — scoped source review, tests or browser evidence listed above.
- No test skipped without a written reason: **PASS** — scoped source review, tests or browser evidence listed above.
- Suite passes from a clean checkout: **FAIL** — not fully verified; see limitations and remaining work above.

### Gates **[stack]**

- Lint clean: **PASS** — scoped source review, tests or browser evidence listed above.
- Format clean: **PASS** — scoped source review, tests or browser evidence listed above.
- Type check clean: **PASS** — scoped source review, tests or browser evidence listed above.
- Build clean: **FAIL** — Next production build passes; fresh Prisma generation gate still blocked by baseline EPERM.
- Full test suite passes: **FAIL** — not fully verified; see limitations and remaining work above.

### Documentation

- Every document required by MASTER_PROMPT section 13 updated: **PASS** — scoped source review, tests or browser evidence listed above.
- `docs/CHANGELOG.md` entry added under Unreleased: **PASS** — this report, self review and updated changelog.
- Documentation describes what the code does today: **PASS** — scoped source review, tests or browser evidence listed above.

### Final

- Self review completed per `handbook/18_SELF_REVIEW.md`: **PASS** — this report, self review and updated changelog.
- Definition of Done met per `handbook/19_DEFINITION_OF_DONE.md`: **FAIL** — not fully verified; see limitations and remaining work above.
- Repository builds and runs: **PASS** — scoped source review, tests or browser evidence listed above.

## ACCESSIBILITY_CHECKLIST.md — item-by-item


### Semantics

- Native elements used before ARIA: button, a, input, label, table: **PASS** — reviewed semantics and browser evidence above.
- A clickable element is a button or a link, never a bare div or span: **FAIL** — not fully verified; see limitations and remaining work above.
- Landmark regions present: header, nav, main, footer: **PASS** — reviewed semantics and browser evidence above.
- One h1 per page; heading levels descend without skipping: **PASS** — reviewed semantics and browser evidence above.
- Lists marked up as lists: **PASS** — reviewed semantics and browser evidence above.
- Tables have headers with correct scope: **PASS** — reviewed semantics and browser evidence above.
- Language set on the document: **PASS** — reviewed semantics and browser evidence above.

### Keyboard

- Every interactive element reachable by Tab: **FAIL** — not fully verified; see limitations and remaining work above.
- Tab order follows visual order: **FAIL** — not fully verified; see limitations and remaining work above.
- No keyboard trap: **FAIL** — not fully verified; see limitations and remaining work above.
- Enter and Space activate controls as expected: **FAIL** — not fully verified; see limitations and remaining work above.
- Escape closes dialogs, menus, and popovers: **PASS** — reviewed semantics and browser evidence above.
- Arrow keys work in composite widgets: **N/A** — new UI uses native buttons/search/selects; no required data-entry flow, time limit, composite widget or audio/video.
- A skip link is present and works: **FAIL** — not fully verified; see limitations and remaining work above.

### Focus

- Focus indicator visible on every focusable element: **FAIL** — not fully verified; see limitations and remaining work above.
- Focus indicator meets contrast requirements: **PASS** — focus/card contrast 4.17:1.
- Focus never removed without an equivalent replacement: **PASS** — reviewed semantics and browser evidence above.
- Focus moves into a dialog on open and returns on close: **PASS** — reviewed semantics and browser evidence above.
- Focus is managed on route change: **FAIL** — not fully verified; see limitations and remaining work above.
- Focus is not lost when content updates or an element is removed: **FAIL** — not fully verified; see limitations and remaining work above.

### Screen reader

- Every control has an accessible name: **PASS** — reviewed semantics and browser evidence above.
- Icon-only buttons have a text label: **PASS** — reviewed semantics and browser evidence above.
- Images have alt text; decorative images have empty alt: **PASS** — reviewed semantics and browser evidence above.
- Form fields have associated labels, not placeholder-only: **PASS** — reviewed semantics and browser evidence above.
- Errors are announced and associated with their field: **N/A** — no new mutating form validation; existing forms retained.
- Dynamic updates announced via a live region where appropriate: **PASS** — reviewed semantics and browser evidence above.
- Content hidden visually is also hidden from assistive technology, and vice versa: **FAIL** — not fully verified; see limitations and remaining work above.

### Color and contrast

- Body text contrast at least 4.5:1: **FAIL** — token samples pass; every text/image combination has not been instrumented.
- Large text contrast at least 3:1: **FAIL** — token samples pass; every text/image combination has not been instrumented.
- Interactive borders and icons at least 3:1: **PASS** — new input border/card contrast 3.22:1; accent icons exceed 3:1.
- Color is never the sole carrier of meaning: **PASS** — reviewed semantics and browser evidence above.
- Readable in both light and dark themes: **N/A** — requested dark-only design.
- Readable at 200% zoom without loss of content: **FAIL** — not fully verified; see limitations and remaining work above.

### Forms

- Labels are visible and persistent: **PASS** — reviewed semantics and browser evidence above.
- Required fields marked in text, not by color alone: **N/A** — new UI uses native buttons/search/selects; no required data-entry flow, time limit, composite widget or audio/video.
- Validation errors are specific and suggest a fix: **N/A** — no new mutating form validation; existing forms retained.
- Errors appear near the field and in a summary: **N/A** — no new mutating form validation; existing forms retained.
- Field purpose set for autofill where relevant: **N/A** — new UI uses native buttons/search/selects; no required data-entry flow, time limit, composite widget or audio/video.
- No timeout that cannot be extended: **N/A** — new UI uses native buttons/search/selects; no required data-entry flow, time limit, composite widget or audio/video.

### Motion and media

- `prefers-reduced-motion` respected: **PASS** — shared reduced-motion token rules and motion-safe skeletons.
- Nothing flashes more than three times per second: **PASS** — reviewed semantics and browser evidence above.
- Auto-playing or moving content can be paused: **N/A** — new UI uses native buttons/search/selects; no required data-entry flow, time limit, composite widget or audio/video.
- Video has captions; audio has a transcript: **N/A** — new UI uses native buttons/search/selects; no required data-entry flow, time limit, composite widget or audio/video.

### Responsive and touch

- Usable at 320px width without horizontal scrolling: **PASS** — reviewed semantics and browser evidence above.
- Touch targets at least 44x44: **FAIL** — not fully verified; see limitations and remaining work above.
- Works in both orientations: **FAIL** — not fully verified; see limitations and remaining work above.
- Content reflows at 400% zoom: **FAIL** — not fully verified; see limitations and remaining work above.

### States

- Loading state announced, not silent: **PASS** — reviewed semantics and browser evidence above.
- Empty state explains what to do next: **PASS** — reviewed semantics and browser evidence above.
- Error state explains how to recover: **FAIL** — not fully verified; see limitations and remaining work above.
- Disabled state communicates why: **PASS** — reviewed semantics and browser evidence above.

### Verification

- Automated checker run with zero violations: **FAIL** — not fully verified; see limitations and remaining work above.
- Full task completed using only the keyboard: **FAIL** — not fully verified; see limitations and remaining work above.
- Full task completed using a screen reader: **FAIL** — not fully verified; see limitations and remaining work above.
- Checked at 200% zoom: **FAIL** — not fully verified; see limitations and remaining work above.

## SECURITY_CHECKLIST.md — item-by-item


### Authentication

- Every non-public route requires authentication: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Credentials verified server-side: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Passwords hashed with a current, slow, salted algorithm — never encrypted, never plain: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Login failure gives a generic message that does not confirm account existence: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Brute force is rate limited or throttled: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Account enumeration is not possible via login, reset, or registration: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.

### Sessions and tokens

- Session identifier is unpredictable and long enough: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Session regenerated on privilege change and on login: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Sessions expire, both idle and absolute: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Logout invalidates server-side, not only client-side: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Cookies set HttpOnly, Secure, and SameSite: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Tokens are validated for signature, expiry, issuer, and audience: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- No sensitive claim is trusted from an unverified token: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.

### Authorization

- Deny by default: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Enforced server-side on every request: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- **Object-level ownership checked, not just route-level role**: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Horizontal escalation attempted and blocked: another user's ID substituted: **FAIL** — full release security audit/integration verification not completed in this scope.
- Vertical escalation attempted and blocked: lower role calling a higher-role action: **FAIL** — full release security audit/integration verification not completed in this scope.
- Hidden or disabled UI is never the only control: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.
- Denial does not reveal whether the object exists: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.

### Input handling

- Every input validated at the boundary, server-side: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Allow-list validation, not deny-list: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Unknown fields rejected: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Size and length limits enforced: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Type coercion cannot bypass a check: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.

### Injection

- Queries parameterized; no string-built SQL: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.
- No user input in a shell command: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.
- No user input in a path without canonicalization and containment check: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- No user input reaching an eval, template, or deserialization sink: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.
- Output encoded at the point of rendering, per context: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.

### Data protection

- Personal and sensitive data identified and inventoried: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Sensitive data encrypted at rest where required: **FAIL** — full release security audit/integration verification not completed in this scope.
- All traffic over TLS: **FAIL** — full release security audit/integration verification not completed in this scope.
- API responses return only the fields the caller needs: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.
- No internal ID, path, version, or stack trace exposed in an error: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.

### Secrets

- No secret in source, fixtures, tests, or comments: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- No secret in a client bundle or a public asset: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.
- No secret in logs, error messages, or telemetry: **PASS** — public read-only DTOs, React escaping tests, approval metadata check and existing server boundaries.
- Secrets come from environment configuration: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Any secret ever committed has been rotated, not merely removed: **FAIL** — full release security audit/integration verification not completed in this scope.

### File upload

- File type validated by content, not by extension or client content-type: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Size limit enforced: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Stored outside the web root, or served from a separate origin: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Filename sanitized; path traversal impossible: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Uploads are not executable: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.

### Configuration

- Security headers set: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- CORS restricted to known origins; no wildcard with credentials: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Debug mode and verbose errors off in production: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Default credentials changed: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Directory listing disabled: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Unused endpoints and admin interfaces removed or protected: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.

### Dependencies

- No known vulnerability of high severity outstanding: **FAIL** — full release security audit/integration verification not completed in this scope.
- Lockfile committed: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- No new dependency added without justification and review: **PASS** — no application dependency added; Prettier ran temporarily from cache.

### Abuse

- Rate limiting on authentication, search, export, and other expensive operations: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- No unbounded operation reachable by an unauthenticated caller: **PASS** — existing account list is paginated; new telemetry source is empty.
- Mutating operations protected against cross-site request forgery: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.

### Logging and audit

- Security-relevant events logged: login, failure, privilege change, denial: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Logs contain no secret, token, or password: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Logs contain no unnecessary personal data: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.
- Logs are sufficient to reconstruct an incident: **N/A** — existing control retained; no new account/session/upload/mutation integration in this frontend slice.

### Sign-off

- Every line above checked against the code: **FAIL** — full release security audit/integration verification not completed in this scope.
- Findings recorded with attack path, impact, and remediation: **FAIL** — full release security audit/integration verification not completed in this scope.
- `docs/SECURITY.md` updated if a control changed: **PASS** — metadata visibility change and integration privacy boundary documented.

