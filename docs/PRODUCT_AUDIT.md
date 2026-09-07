# Product audit — AREUS

> Phase 1 deliverable per `.claude/prompts/FULL_BUILD.md` §68.
> Date: 2026-08-22
> Reference: the live site at `areustierlist.vercel.app`.
> The original source repository is not available (FULL_BUILD §64).

Every statement below is classified:

| Tag | Meaning |
|---|---|
| **VERIFIED** | Observed directly on the live site |
| **REQUIRED** | Mandated by FULL_BUILD.md regardless of the live site |
| **PROPOSED** | My design decision, not observed and not mandated |
| **UNKNOWN** | Could not be determined |

---

## 1. What AREUS is

**VERIFIED** — A competitive ranking platform for Minecraft PvP. Players are
ranked per gamemode. Match results are submitted with screenshot evidence and
approved by staff before ratings change.

**VERIFIED** — It is not a tier-list *maker*. Rankings are earned through
reviewed matches, not assembled by dragging tiles.

---

## 2. Observed navigation

**VERIFIED** — Home, Players, Gamemodes, My Profile, Dashboard, Submit Match,
Login/Register.

**VERIFIED** — "My Profile" renders "Not logged in" when unauthenticated.

**VERIFIED** — An admin dashboard exists and is described as staff-only.

---

## 3. Observed match lifecycle

**VERIFIED** — Submission carries: username, opponent username, gamemode,
player score, opponent score, screenshot proof, optional notes.

**VERIFIED** — Results go to administrative review; ratings update only after
approval. Ranking is not computed automatically on submission.

**REQUIRED** — FULL_BUILD §38 inserts an opponent-confirmation step the live
site does not appear to have:

```
submission -> opponent confirmation -> admin review -> approved/rejected -> rating
```

**REQUIRED** — §38: no opponent response within a configurable window escalates
to admin review.

---

## 4. Observed roles

**VERIFIED** — Staff-only admin area. Admin assignment is owner-only, so at
least three levels exist.

**REQUIRED** — §387: `PLAYER < ADMIN < OWNER`. Admin must not self-promote,
create owners, or bypass authorization.

---

## 5. Gamemodes — a live inconsistency

**VERIFIED** — Two different lists appear on the same page.

| Source on live site | Gamemodes listed |
|---|---|
| Gamemodes section | Sword, Axe, Crystal, UHC, Mace, TNT Cart, Spear |
| Submit Match dropdown | Sword, Crystal, Pot, Mace, Axe, UHC, SMP |

Common to both: Sword, Axe, Crystal, UHC, Mace.
Only in the section: **TNT Cart, Spear**.
Only in the dropdown: **Pot, SMP**.

This is a genuine product defect on the live site: a player cannot submit a
match for a gamemode the site advertises, and can submit for two it does not.
It is exactly the failure FULL_BUILD §34 legislates against — gamemodes
hardcoded in more than one place, drifting apart.

**PROPOSED** — The rebuild seeds all nine observed gamemodes from one database
table, so the two lists cannot diverge again. Which nine are genuinely active
is a product decision for the owner; `active` is a column, so disabling any of
them is a data change, not a code change.

---

## 6. Observed admin capabilities

**VERIFIED** — Pending player approvals; approved player management; match
review queue; admin assignment (owner-only).

**REQUIRED** — §1244: approve, reject, request more information. Rejection
requires a reason. §1230: reviewer sees evidence, history, head-to-head,
suspicious indicators, and projected rating impact.

---

## 7. Registration flow

**VERIFIED** — Login and register exist.

**REQUIRED** — §1600: register with username, email, password, confirm
password, Minecraft username, then wait for admin approval before competitive
features unlock. Pending state must be unmistakable.

---

## 8. Rules

**VERIFIED** — The live site states rules covering: use correct usernames,
provide clear match evidence, do not manipulate results.

---

## 9. What could not be determined

| Item | Why |
|---|---|
| Live tech stack | **UNKNOWN** — `WebFetch` converts pages to markdown and discards `<script>` tags, so framework fingerprints were unavailable |
| Live database | **UNKNOWN** — not observable from outside |
| Rating algorithm | **UNKNOWN** — no formula exposed publicly |
| Tier thresholds | **UNKNOWN** — no tier labels observed |
| Authenticated UI | **UNKNOWN** — no credentials; logged-in and admin views were never rendered |
| Player data | **UNKNOWN** — `/players` and `/gamemodes` returned HTTP 404 to a direct fetch, indicating client-side routing |

None of these were guessed. Where FULL_BUILD specifies behavior, that
specification governs; where it does not, the choice is tagged **PROPOSED** and
recorded in an ADR.

---

## 10. Deliberate departures from the live site

FULL_BUILD §80 states the live site is a product reference, not an architecture
reference, and §84 forbids reproducing weak patterns. These are intentional
differences:

| Live behavior | Rebuild | Reason |
|---|---|---|
| Submitter types their own username | Identity taken from the session | §1182 — free-text identity permits impersonation |
| Two diverging gamemode lists | One database table, one source | §34 / §1080 |
| No opponent confirmation | Opponent confirms before admin review | §38 — evidence alone is weak |
| Server-rendered routes returned 404 | Real routes, shareable and SEO-visible | §28 / §29 |
| "Loading..." placeholders | Contextual skeletons | §1723 |
