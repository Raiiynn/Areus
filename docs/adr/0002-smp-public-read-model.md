# ADR 0002: Separate SMP public read model from legacy PvP ratings

Date: 2026-10-14. Status: accepted for frontend implementation.

The existing schema stores reviewed PvP matches, not Minecraft telemetry. Mapping
wins to kills, losses to deaths, or accounts to verified Minecraft identities
would create false public data. Preserve that schema and its services.

Add a typed, intentionally unavailable SMP read model behind a server-only
service. Render unavailable values and empty lists until an authoritative adapter
is implemented. Public DTOs contain only approved statistics; no connection
details or integration tokens. Pure ranking rules live in domain; delivery and
filters depend inward. No new infrastructure or ORM dependency enters domain.

Consequence: the public frontend is reviewable without a Minecraft plugin, but
live rankings, real profiles, verified status and cooldowns require integration.
Keep legacy routes for compatibility; do not redirect old match rankings into
semantically different survival rankings.
