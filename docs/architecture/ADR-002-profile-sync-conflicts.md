# ADR-002: Conflict-safe profile synchronization

- **Status:** Accepted for implementation
- **Date:** 2026-10-07
- **Scope:** local profile snapshots synchronized through Supabase `user_progress`

## Decision

Cloud sync is an explicit application flow. Local profile reads and writes never start network requests. A read result distinguishes a missing row from an unavailable/error result; errors never authorize an upload.

Each successful cloud write advances a server-owned integer revision with compare-and-swap against the revision the client last read. Each local profile records the last acknowledged cloud revision and its local revision at that sync. Timestamps are display/diagnostic metadata only and never select a whole profile.

On upload acknowledgement, reread local persistence. Preserve its current content, revision, and timestamps; acknowledge only the revision actually uploaded. A newer local revision remains dirty. If the local profile identity changed during the request, preserve that replacement without attaching the old acknowledgement. This does not change explicit cloud-download semantics.

Target merge behavior for a shared base revision:

- Append-only game-review facts and puzzle-attempt events merge by stable evidence ID. Equal IDs with equal content deduplicate; equal IDs with different content are conflicts.
- Completion sets merge by stable lesson/exercise/opening IDs.
- Derived recommendations and training plans are recomputed after a merge.
- Counters, settings, and snapshots without event identity are non-mergeable. If both devices changed them from the shared base, return a conflict requiring an explicit user choice; never silently select one whole profile.
- If no base revision exists and both local and cloud profiles contain progress, treat the pair as a conflict. An empty local profile may adopt an existing cloud profile, and a missing cloud row may receive local data.

Until base snapshots and field-level change detection are implemented, the coordinator conservatively surfaces a conflict whenever both snapshots are dirty. It does not auto-merge evidence yet.

The local copy remains authoritative for offline use. A failed read, failed compare-and-swap, or unresolved conflict preserves both snapshots. The UI offers explicit local/cloud resolution; evidence that can be safely merged remains available after resolution.

## Consequences

- `user_progress` needs a non-negative cloud revision and an atomic conditional update. Existing rows migrate forward with revision zero; no profile data is dropped.
- The local sync metadata needs a schema migration for base cloud revision and local revision at last sync.
- Cloud schema changes are additive. Deployment status must be verified separately; clients handle the migration being absent as a safe sync error, not as permission to overwrite.
- Sync status becomes observable and includes conflict.

## Rejected

- Timestamp/latest-profile-wins: concurrent/offline progress can be silently lost.
- Blind upsert during login: a failed or stale read can overwrite cloud data.
- Automatic addition of counters: without per-event identity, retries and overlapping devices double-count progress.
