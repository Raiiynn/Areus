#!/usr/bin/env bash
# End-to-end verification against a running AREUS server.
#
# Exercises the real HTTP surface: public pages, session validation, the
# approval gate, and the authorization boundaries.
#
# Written as curl rather than a browser harness because no browser automation is
# available in this environment (docs/ARCHITECTURE_AUDIT.md §6). Sessions are
# minted directly rather than driven through the login form: Server Actions
# require a `Next-Action` header carrying a build-specific action id, which is
# not practical to reproduce from a shell. What that means honestly:
#
#   COVERED     — session validation, role gates, object-level authorization,
#                 server rendering, data leakage, security headers.
#   NOT COVERED — the login form POST itself. The login *logic* is covered by
#                 tests/security.test.ts and the credential path by
#                 tests/authorization.test.ts, but the form round trip is not
#                 verified here.
#
# Usage: bash scripts/e2e-check.sh [base-url]

set -uo pipefail

BASE="${1:-http://localhost:3100}"
PASS=0
FAIL=0

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1 — $2"; FAIL=$((FAIL + 1)); }

# Fetch, returning "status<newline>body".
fetch() {
  local url="$1" token="${2:-}"
  if [ -n "$token" ]; then
    curl -s -w '\n%{http_code}' -H "Cookie: areus_session=$token" "$BASE$url"
  else
    curl -s -w '\n%{http_code}' "$BASE$url"
  fi
}

check_status() {
  local label="$1" url="$2" expected="$3" token="${4:-}"
  local code
  if [ -n "$token" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: areus_session=$token" "$BASE$url")
  else
    code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$url")
  fi
  if [ "$code" = "$expected" ]; then pass "$label ($code)"
  else fail "$label" "expected $expected, got $code"; fi
}

# Asserts 200 *and* the needle. Without the status assertion a redirect body
# could satisfy a grep and produce a false pass.
check_contains() {
  local label="$1" url="$2" needle="$3" token="${4:-}"
  local response code body
  response=$(fetch "$url" "$token")
  code="${response##*$'\n'}"
  body="${response%$'\n'*}"

  if [ "$code" != "200" ]; then
    fail "$label" "expected 200, got $code"
  elif printf '%s' "$body" | grep -q -- "$needle"; then
    pass "$label"
  else
    fail "$label" "200 but did not contain '$needle'"
  fi
}

check_absent() {
  local label="$1" url="$2" needle="$3" token="${4:-}"
  local response body
  response=$(fetch "$url" "$token")
  body="${response%$'\n'*}"
  if printf '%s' "$body" | grep -q -- "$needle"; then
    fail "$label" "found '$needle' when it should be absent"
  else pass "$label"; fi
}

# As check_absent, but the needle is an extended regex.
check_absent_re() {
  local label="$1" url="$2" pattern="$3" token="${4:-}"
  local response body
  response=$(fetch "$url" "$token")
  body="${response%$'
'*}"
  if printf '%s' "$body" | grep -qE -- "$pattern"; then
    fail "$label" "matched /$pattern/ when it should be absent"
  else pass "$label"; fi
}

echo "=== Public pages render ==="
check_status  "landing"          "/"                      200
check_status  "players"          "/players"               200
check_status  "gamemodes"        "/gamemodes"             200
check_status  "gamemode detail"  "/gamemodes/sword"       200
check_status  "leaderboards"     "/leaderboards"          200
check_status  "rules"            "/rules"                 200
check_status  "login"            "/login"                 200
check_status  "register"         "/register"              200
check_status  "unknown gamemode" "/gamemodes/nonexistent" 404
check_status  "unknown player"   "/players/NoSuchPlayer"  404

echo ""
echo "=== Server-rendered content (no JS required) ==="
check_contains "ladder data in HTML"        "/leaderboards?gamemode=sword" "Aureon"
check_contains "tier badge rendered"        "/leaderboards?gamemode=sword" "Tier"
check_contains "profile stats"              "/players/Aureon" "Gamemode statistics"
check_contains "rules are db-driven"        "/rules" "Diamond sword"

echo ""
echo "=== Gamemode single-source-of-truth ==="
# The live site advertised TNT Cart and Spear while offering Pot and SMP in the
# submit dropdown. Both lists read one table here, so all nine appear.
for mode in Sword Axe Crystal UHC Mace Pot SMP "TNT Cart" Spear; do
  check_contains "gamemode '$mode' listed" "/gamemodes" "$mode"
done

echo ""
echo "=== Unauthenticated access is refused ==="
check_status "dashboard redirects"   "/dashboard"             307
check_status "profile redirects"     "/profile"               307
check_status "matches redirects"     "/matches"               307
check_status "submit redirects"      "/matches/submit"        307
check_status "admin hidden"          "/admin"                 307
check_status "evidence route hidden" "/api/evidence/anything" 404

echo ""
echo "=== Session validation ==="
check_status "forged session rejected" "/dashboard" 307 "not-a-real-token"
check_status "empty session rejected"  "/dashboard" 307 ""

PLAYER_TOKEN=$(npx tsx scripts/mint-session.ts Aureon 2>/dev/null | tail -1)
ADMIN_TOKEN=$(npx tsx scripts/mint-session.ts Marshal 2>/dev/null | tail -1)
OWNER_TOKEN=$(npx tsx scripts/mint-session.ts Areus 2>/dev/null | tail -1)
PENDING_TOKEN=$(npx tsx scripts/mint-session.ts Ashvane 2>/dev/null | tail -1)
SUSPENDED_TOKEN=$(npx tsx scripts/mint-session.ts Grimwald 2>/dev/null | tail -1)

if [ ${#PLAYER_TOKEN} -eq 64 ]; then pass "session minted for test"
else fail "session minted for test" "unexpected token: $PLAYER_TOKEN"; fi

echo ""
echo "=== Authenticated player ==="
check_status   "dashboard reachable"       "/dashboard"      200 "$PLAYER_TOKEN"
check_contains "dashboard is personal"     "/dashboard"      "Aureon" "$PLAYER_TOKEN"
check_status   "profile reachable"         "/profile"        200 "$PLAYER_TOKEN"
check_status   "matches reachable"         "/matches"        200 "$PLAYER_TOKEN"
check_status   "submit form reachable"     "/matches/submit" 200 "$PLAYER_TOKEN"
check_contains "submitter identity fixed"  "/matches/submit" "Submitting as" "$PLAYER_TOKEN"
check_contains "gamemode options db-driven" "/matches/submit" "TNT Cart" "$PLAYER_TOKEN"

echo ""
echo "=== Approval gate ==="
check_contains "pending account told why"   "/matches/submit" "awaiting approval" "$PENDING_TOKEN"
check_absent   "pending cannot see the form" "/matches/submit" "Submitting as" "$PENDING_TOKEN"
check_contains "suspended account told why"  "/matches/submit" "suspended" "$SUSPENDED_TOKEN"
check_absent   "suspended cannot see the form" "/matches/submit" "Submitting as" "$SUSPENDED_TOKEN"

echo ""
echo "=== Authorization: player cannot reach staff areas ==="
check_status "player blocked from /admin"         "/admin"         307 "$PLAYER_TOKEN"
check_status "player blocked from /admin/players" "/admin/players" 307 "$PLAYER_TOKEN"
check_status "player blocked from /admin/matches" "/admin/matches" 307 "$PLAYER_TOKEN"
check_status "player blocked from /admin/admins"  "/admin/admins"  307 "$PLAYER_TOKEN"

echo ""
echo "=== Admin ==="
check_status   "admin reaches overview"      "/admin"         200 "$ADMIN_TOKEN"
check_status   "admin reaches player queue"  "/admin/players" 200 "$ADMIN_TOKEN"
check_status   "admin reaches review queue"  "/admin/matches" 200 "$ADMIN_TOKEN"
check_contains "pending registrations shown" "/admin/players" "Ashvane" "$ADMIN_TOKEN"
check_contains "flagged match surfaced"      "/admin/matches" "Flagged" "$ADMIN_TOKEN"
check_contains "head-to-head shown"          "/admin/matches" "Head to head" "$ADMIN_TOKEN"

echo ""
echo "=== Authorization: admin cannot reach owner-only area ==="
check_status "admin blocked from /admin/admins" "/admin/admins" 307 "$ADMIN_TOKEN"

echo ""
echo "=== Owner ==="
check_status   "owner reaches admin management" "/admin/admins" 200 "$OWNER_TOKEN"
check_contains "owner sees promotion controls"  "/admin/admins" "Promote" "$OWNER_TOKEN"

echo ""
echo "=== Data leakage ==="
# Matches the shape of a bcrypt hash, not a bare '$2'. Next.js writes React
# Flight references as $2a, $20, $22 and so on, and their numbering shifts
# whenever page content changes - so a substring check here passes or fails
# by coincidence rather than by whether a hash actually leaked.
check_absent_re "no password hash in player list" "/players" '[$]2[aby]?[$][0-9]{2}[$]'
check_absent "no email on public profile"      "/players/Aureon" '@areus.test'
check_absent "suspended account not public"    "/players"        'Grimwald'
check_absent "no email in leaderboard"         "/leaderboards"   '@areus.test'

echo ""
echo "=== Security headers ==="
HEADERS=$(curl -s -D - -o /dev/null "$BASE/" | tr 'A-Z' 'a-z')
for header in "x-content-type-options: nosniff" "x-frame-options: deny" "referrer-policy"; do
  if printf '%s' "$HEADERS" | grep -q "$header"; then pass "header '$header'"
  else fail "header '$header'" "not present"; fi
done

echo ""
echo "==================================="
echo "  passed: $PASS   failed: $FAIL"
echo "==================================="
[ "$FAIL" -eq 0 ]
