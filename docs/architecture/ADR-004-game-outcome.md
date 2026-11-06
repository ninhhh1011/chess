# ADR-004: One live-game outcome

- **Status:** Accepted for implementation under Phase 2
- **Date:** 2026-10-15
- **Scope:** live-game result, review result, result recording and end sounds

## Evidence

`ChessGameBoard` compares chess.js colors (`w`/`b`) with `white`/`black`, so every checkmate is recorded as a loss and plays defeat audio. `PostGameReview` independently derives the winner and parses Vietnamese notice text for resignation. Resignation changes lifecycle only, so the board's chess.js-terminal guard never records it. UI and persistence can therefore disagree.

## Decision

The live `GameSession` owns a typed outcome: checkmate or resignation with a winning chess.js color, draw with no winner, or no outcome while unfinished. Derive the player's `win`/`lose`/`draw` from that outcome and the player color through one domain function; do not store a redundant player-relative result in the outcome.

Committed live moves derive checkmate/draw from chess.js. A valid resignation while playing records the opponent as winner. Reset/start/undo invalidate the previous outcome; review and analysis transitions preserve the completed live-game outcome. Analysis variations never replace it.

The React adapter exposes the outcome and player result. Recording, sounds and post-game review consume that result. Remove the writable `resultNotice` semantic state and UI string parsing; preserve the existing result-dialog copy. The existing provider-lifetime recording claim continues to prevent duplicate writes across rerenders and route remounts.

## Behavior corrections

- A player checkmate win records a win and plays victory audio for either player color.
- A player resignation records one loss even though the board position is not terminal in chess.js.
- Draw rules continue to use chess.js without a new adjudication policy.

These are correctness fixes to completed-game progress. Existing aggregate losses cannot be reconstructed reliably, so this change does not rewrite historical statistics.

## Verification

Pin both-color wins/losses, supported draw rules, resignation, unfinished positions, reset/undo invalidation and analysis preservation in domain tests. Integration tests must show review, profile, statistics and audio agreeing for a win and resignation, retaining StrictMode/remount deduplication and same-PGN replacement-game coverage.
