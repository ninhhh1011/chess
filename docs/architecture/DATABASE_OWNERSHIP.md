# Database ownership inventory

This is a source-code inventory, not a report of deployed database state. The repository has no verified production table counts, migration ledger, or backup/export record. Never infer deployment from `schema.sql` or a checked-in migration.

| Table/object | Owner and purpose | Current writer / reader | Retention | Source RLS / state |
|---|---|---|---|---|
| `profiles` | Supabase identity metadata | No active application query found | Account lifetime; deployment policy unknown | RLS owner-scoped in `schema.sql`; not in the current migration chain |
| `user_progress` | Cloud copy of the local learning profile and sync revision | `cloudProfileService.js`; Training sync actions | Until account deletion or user request; no deletion flow verified | Owner-scoped policies in schema and additive sync migration; deployed revision migration unverified |
| `training_events` | Optional event history | `logTrainingEvent` exists, no current caller found | No retention/cleanup policy found | Owner-scoped RLS in snapshot; migration absent |
| `opening_progress` | Optional per-opening progress copy | Cloud save/load functions exist, no current caller found | Account lifetime unless deleted | Owner-scoped RLS in snapshot; migration absent |
| `game_reviews` | Optional cloud review records | `saveGameReview` exists, no current caller found | Account lifetime unless deleted | Owner-scoped RLS in snapshot; migration absent |
| `coach_messages` | Historical Coach conversation storage | `saveCoachMessage` exists, no current caller found; Coach v1 is stateless | Existing rows must be inventoried before deletion | Owner-scoped policies in snapshot; migration absent |
| `online_games` | Retired multiplayer data | No active client writer/reader | Preserve pending deployed row inventory and retention decision | Historical migration was public-read; forward hardening revokes `PUBLIC`/client grants and removes all policies with RLS enabled (default deny), deployment unverified |
| `chess_knowledge`, `chat_embeddings`, `match_chess_knowledge` | Retired RAG/vector retrieval | No active application caller; seeding and client retrieval tools removed | Preserve existing rows pending deployed inventory/export | Removed from fresh schema snapshot; forward migration revokes client access and denies RLS, deployment unverified |

## Migration ownership

`supabase/migrations/` is the ordered forward-change source. `supabase/schema.sql` is a legacy bootstrap snapshot, not a verified generated dump and not the deployed source of truth. It currently contains legacy profile/progress tables and policies; only online-game retirement, RAG access retirement, and profile sync revision have migrations in this checkout. Fresh database creation and deployed upgrade do not yet converge from a complete canonical migration chain.

## Open deployment gates

- Record applied migration versions and actual tables/policies for each Supabase project.
- Export/count retained `online_games`, `chess_knowledge`, `chat_embeddings`, and `coach_messages` rows before any destructive drop.
- Verify the online and RAG retirement migrations and the profile revision migration against deployed RLS, grants, and constraints.
- Decide account deletion and retention for profile, training, opening, game-review, and Coach-message data.
- Convert the legacy snapshot to a reproducible output or remove it only after a complete migration chain is established.
