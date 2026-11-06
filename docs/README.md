# Documentation index

Read only the document relevant to the task. Current source and fresh checks take precedence over dated reports.

## Current project context

- [Current runtime source map](CURRENT_RUNTIME.md): production paths, status, and evidence precedence.
- [Runtime architecture](ARCHITECTURE.md): component and service flows.
- [Corpus deployment](CORPUS_DEPLOYMENT.md): active puzzle data and delivery process.
- [Security checklist](SECURITY_CHECKLIST.md): security review items.
- [Product scope ADR](architecture/ADR-001-product-scope.md): current v1 product boundary.
- [Target architecture](architecture/TARGET_ARCHITECTURE.md): layer and ownership contracts.
- [Profile sync ADR](architecture/ADR-002-profile-sync-conflicts.md): revision and conflict policy.
- [Coach contract ADR](architecture/ADR-003-coach-request-boundary.md): bounded guest request, supported chess context, evidence and abuse policy.
- [Game outcome ADR](architecture/ADR-004-game-outcome.md): one result shared by live game, review, recording and sounds.
- [Database ownership inventory](architecture/DATABASE_OWNERSHIP.md): source ownership, retention, RLS, migration and deployment gates.

## Historical and task material

- `CODEX_TECH_EXECUTION_PLAN.md`: long-running technical roadmap; consult only for roadmap-specific work.
- `superpowers/plans/` and `superpowers/specs/`: design inputs for their named work, not current implementation truth.
- `task-reports/` and `verifications/`: dated task evidence. Use the report matching the task; do not read the directories wholesale.
- `dev-notes/manual-tests/`: ad hoc manual test files.
- Visual QA, migration, redesign, and phase reports at this level are historical snapshots unless a task explicitly refers to them.

## Precedence

1. Current source/runtime behavior and fresh checks.
2. The task's current contract and the matching recent verification report.
3. `CURRENT_RUNTIME.md` and `ARCHITECTURE.md`.
4. Older plans and reports as historical context only.
