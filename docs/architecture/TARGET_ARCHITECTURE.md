# Target architecture (proposed)

This is a staged target for PRODUCT_SCOPE_V1 in [ADR-001](ADR-001-product-scope.md), not a request to mass-move files. Keep current behavior while seams are established. Each concept gets one owner and one canonical contract.

```text
React routes / feature UI
        ↓ events + view models
Application use cases (start game, attempt/commit move, review, record progress,
                        sync profile, ask Coach)
        ↓
Chess domain (chess.js rules + game lifecycle)     Profile/training domain
        ↓ ports                                         ↓ ports
Infrastructure: Stockfish / local storage / Supabase / Coach HTTP

Coach HTTP transport (Vercel production; Express local adapter)
        ↓
shared validation + guest policy + body/time limits + durable production rate limit
        ↓
one Coach service: validate context → build prompt → provider call
        ↓
truthful response source + evidence references
```

## Ownership and contracts

| Concept | Owner/source of truth | Mutators | Input → output |
| --- | --- | --- | --- |
| Live game | Game domain state built on `chess.js`; lifecycle is `lobby`, `playing`, `game_over`, `review`, or `analysis`; pending promotion belongs to the same state | Game use cases only | Commands (start, attempt move, choose promotion, undo, resign, reset) → state snapshot and explicit transition result |
| Board interaction | Play UI feature | UI events only | Square/drag/hint events → use-case command; selection/highlights/orientation remain view state |
| Bot orchestration | Play application use case | Bot use case | Current FEN + difficulty + cancellation → one legal move result or explicit failure; stale FEN cannot commit |
| Engine analysis | Engine port/adapter result | Engine adapter returns; use case selects policy | FEN + limits + cancellation → `{ score, perspective: 'white', source, bestMove?, depth? }`; positive White advantage, fallback never labeled Stockfish |
| Review facts | Analysis application service | Review use case | PGN/FEN + engine port → validated `analysis.v1` facts with one CPL/classification/evidence identity; UI never recomputes |
| Profile/progress | Profile domain schema and repository | Progress-recording use cases | Domain events → versioned profile writes; no sync side effects from repository/profile service |
| Cloud sync | Sync application flow | Explicit login/user sync actions | Local/cloud revision snapshots → field-aware merge or surfaced conflict; no timestamp-only whole-profile overwrite |
| Auth session | Auth adapter exposed to UI through a narrow snapshot/actions API | Auth use cases/adapter | Credentials → session/user/loading + safe result; auth state has no profile/business rules |
| Coach request | Shared `CoachRequestV1` / `CoachResponseV1` | Coach UI sends; server validates/builds response | Bounded question + optional validated current FEN + player level/response style → response with `llm` or `basic` source and evidence metadata; v1 excludes history, PGN, client engine facts, profile snapshots, and RAG |
| Design tokens | `src/styles/theme-charcoal-pine.css` plus HeroUI v3 tokens/wrappers (per repo AGENTS) | UI layer only | Token values → `src/ui` or direct HeroUI primitives; no parallel design system |

## Boundary rules

- React Context is an adapter for distributing a narrow snapshot and stable commands, not the owner of chess rules, persistence, review, engine, bot request policy, or sync.
- Pages/features call application use cases; components render props and emit intent. No feature-wide direct Supabase writes.
- Game core owns legal move/promotion/game status and lifecycle. Promotion attempt yields pending `{from,to,color}`; only q/r/b/n selection commits. Click/drag use the same command.
- Engine adapter normalizes score to White POV exactly once and marks `source`; engine unavailability is handled by application policy. No silent fallback inside result semantics.
- Profile repository owns serialization/migrations only. Training recommendations are pure functions. Progress recorder owns event/evidence deduplication. Sync is explicit and observable through a subscription/state snapshot.
- Auth is optional infrastructure. `AuthContext` exposes user/session/loading and auth actions; pages own form validation/presentation.
- Production Coach transport is the Vercel `/api/coach` entry; Express remains a thin local adapter. Both use `shared/coachContract.js` and `api/coachHandler.js`; requests are limited to 8 KiB and 1,200 question characters, and provider calls have a timeout/token cap. Provider secrets are server-only (`CLAUDE_API_KEY`) and never use `VITE_*` names.
- Coach is stateless and guest-accessible. It accepts only question, optional validated current FEN, player level, and response style. It reports `llm`/`basic` source and position evidence only when a valid FEN was supplied; provider failure yields labeled `basic`, and no mock response is presented as LLM output.
- A local in-memory per-IP limiter is supplementary only. Durable Vercel rate limiting and deployed configuration/E2E verification remain a production gate under P0-04; source code alone does not establish production abuse protection.
- RAG is excluded from v1. Adding it later requires a real server-side retrieval path, metadata, evidence tests, and explicit product decision.
- Supabase schema is owned by migrations. Each table has purpose, writer/reader, retention, and RLS documented. Browser client uses anon credentials under RLS; service role stays server-side.

## Migration order

1. Fix data/security/correctness contracts (promotion, evaluation, online RLS exposure, profile conflict safety). Promotion paths share one pending-selection workflow. Engine result type and adapter now enforce White POV; worker-backed source and cancellation checks remain open. Coach request/handler contracts are implemented; durable Vercel rate limiting and deployed Coach verification remain open under P0-04. Sync conflict safety remains in progress.
2. Extract game use cases and lifecycle while preserving current pages. Lifecycle transitions now have a pure function; complete game ownership extraction remains open. Local/online client paths are removed under accepted ADR-001; the historical table remains inaccessible pending data inventory.
3. Normalize EnginePort results and make fallback/cancellation policy explicit; keep `analysis.v1` facts as the only review facts.
4. Break profile/sync cycle; introduce repository boundary and conflict/version behavior before altering stored data.
5. Narrow AuthContext and unify auth form use cases.
6. Verify the Coach production rate-limit/configuration gate under P0-04; remove dormant RAG only after deployed data and reference checks. The shared Coach contract, handler, and transport adapters are implemented.
7. Move feature files only where a completed boundary makes ownership clearer. Keep HeroUI v3 and current charcoal/pine/copper behavior during architecture work.
8. Clean obsolete artifacts/docs only after runtime, import, route, build, and data-retention evidence is recorded.
