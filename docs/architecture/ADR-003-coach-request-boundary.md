# ADR-003: Bounded, truthful Coach requests

- **Status:** Accepted for implementation
- **Date:** 2026-10-07
- **Scope:** optional chess Coach over Vercel production and Express local transport

## Decision

Coach remains guest-accessible and stateless. The endpoint stores no request, profile, or board data. Both transports call one shared validator and business handler. The v1 request contains only a bounded question, optional syntactically valid current FEN, player level, and response style. History, PGN, client engine claims, profile snapshots, and RAG are excluded because the current backend cannot validate or use them truthfully.

The model prompt includes the validated current position when present and marks user text as untrusted data. A response may claim position context only when a valid FEN was supplied. It cannot claim Stockfish or knowledge retrieval. Provider failure uses deterministic basic coaching with `source: basic`; if the backend is disabled, the client reports `unavailable` or a clearly labeled local basic answer.

Provider credentials use server-only environment names. The endpoint enforces an 8 KiB JSON body, a 1,200-character question, strict field validation, a provider timeout/token cap, safe errors, and per-IP rate limiting. Authentication is not required so guest learning remains available. Production deployment must also enable the hosting platform's durable rate limiting because an in-memory limiter is per process/instance.

Vercel is the production transport; Express is a thin local transport. Neither transport may hold business or prompt logic.

## Consequences

- Shared runtime validation and prompt construction live in `api/coachHandler.js` and its shared contract module.
- The client sends only fields the server consumes and displays the returned source/evidence.
- No request can expose profile data, provider errors, secrets, or unsupported engine/RAG claims.
- Durable production rate limiting remains a deployment requirement and must be verified with the hosting configuration.
