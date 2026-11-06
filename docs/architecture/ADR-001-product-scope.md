# ADR-001: Product scope v1

- Status: Accepted for product scope v1
- Date: 2026-10-07
- Context: `REDESIGN_PLAN.md` proposes a single-player chess learning app, but shipped routes, schema, and docs still contain multiplayer, Coach, and RAG paths. Current runtime evidence overrides those older claims until a decision is accepted.

## Decision

PRODUCT_SCOPE_V1 is a local-first, single-player chess learning application. The player can play the bot, use Stockfish for move hints and post-game review, study lessons and openings, solve the bundled exercises, and track progress. No multiplayer mode is part of v1.

## Required

- Bot game with player color/difficulty, legal chess rules, undo/reset, and truthful fallback disclosure.
- Stockfish-backed hints and review with a single White POV evaluation contract and distinct fallback metadata.
- Lessons, opening study/practice, bundled exercises, and progress/training recommendations.
- Guest access and local progress persistence.

## Optional

- Supabase authentication and cloud progress sync, only when configured; guests retain all required learning/play paths.
- AI Coach as an optional feature, disabled/unavailable when its protected backend is not configured. Enable only after grounding, request validation, abuse controls, and source disclosure are in place.

## Deprecated or to remove

- Online/multiplayer: `OnlinePlay`, `/play/online/:gameId`, `onlineGameService`, home invitation/online CTA, `GAME_MODES.ONLINE` assumptions, `online_games` schema/migration/publication.
- Local two-player mode and its selection UI/branches. This is distinct from guest/local-only persistence.
- RAG/vector retrieval for v1: no canonical Coach caller uses it and Coach contract reports `knowledgeSource: 'none'`. Runtime services, tests and scripts have been removed; vector objects are absent from the fresh schema snapshot and client access is retired by migration while deployed rows remain pending inventory/export.
- Mock Coach responses as a simulated AI source. Deterministic basic coaching may remain only if explicitly labeled `basic` and does not claim board analysis.

## Consequences

The product surface, routes, backend and database should be reduced consistently. Existing user data must be preserved or migrated; dropping multiplayer/RAG database objects requires a deployed-data inventory and backup plan. The online UI/service are removed; forward migrations disable online and RAG client access but retain rows pending that inventory. The scope aligns with `REDESIGN_PLAN.md` and the user-provided HeroUI/charcoal-pine AGENTS rules; visual redesign remains separate.
