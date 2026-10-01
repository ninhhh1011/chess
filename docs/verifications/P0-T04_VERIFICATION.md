# P0-T04 Independent Verification

- Task: verify the reproducible Node/install/static/unit/build/browser/E2E toolchain and CI gate order.
- Verifier: independent subagent `/root/p0_t04_verifier`.
- Base: `main` at `7ecc6a6` (`feat(ui): migrate production to Option C (Charcoal + Pine + Copper) with HeroUI v3.2.4 & Tailwind v4`).
- Verdict: **PASS**.

## Severity findings

- Critical P0-T04 blockers: none.
- High P0-T04 blockers: none.
- High carry-forward observation: fresh `npm ci` reports 12 existing audit advisories (1 low, 1 moderate, 8 high, 2 critical). P0-T04 introduced no dependency, version, or lockfile change; remediation is explicitly outside this task and must follow the dependency Decision Gate.
- Medium: none.
- Low: none.

## Node and lockfile contract

- `.nvmrc` is tracked and contains `22`.
- GitHub Actions selects `22.x`; an actual fresh resolution produced Node `v22.23.2`.
- `v22.23.2` satisfies the root and lockfile engine contract `^20.19.0 || >=22.12.0`.
- `package-lock.json` is lockfile v3. Its working-tree blob and `HEAD` blob are both `052c70a68c1e216b551db12b7f3b8237f3638e52`; `git diff --exit-code -- package-lock.json` exited 0 after `npm ci`.
- The package diff changes only the two P0-T03 E2E script commands to unfiltered `playwright test`; dependencies and devDependencies are unchanged. `.nvmrc` and `playwright.config.js` have no diff.

The verifier ran npm 11.12.1 through the Node 22.23.2 executable and placed that executable first on `PATH`, so lifecycle commands and subprocesses used the CI major rather than the workstation's default Node 24.

## Encoded CI order and failure behavior

The workflow order is sequential and matches the required contract:

| Order | Workflow step | Command/config |
|---:|---|---|
| 1 | Checkout | `actions/checkout@v4` |
| 2 | Setup Node and npm cache | `actions/setup-node@v4`, `node-version: '22.x'`, `cache: 'npm'` |
| 3 | Install | `npm ci` |
| 4 | Lint | `npm run lint` |
| 5 | Typecheck | `npm run typecheck` |
| 6 | Unit/integration | `npm run test` |
| 7 | Build | `npm run build` |
| 8 | Browser install | `npx playwright install --with-deps chromium` |
| 9 | Explicit discovery | `npm run test:e2e -- --list` |
| 10 | Full E2E | `npm run test:e2e` -> unfiltered `playwright test` |
| 11 | Artifact upload | `actions/upload-artifact@v4`, `dist/` |

There is no `continue-on-error` and no `if: always()` override. GitHub Actions' default success condition therefore stops on any failed gate, and artifact upload is reached only after every preceding gate succeeds.

## Fresh workflow-equivalent execution

| Command | Result |
|---|---|
| Node 22.23.2 `npm ci` | PASS, exit 0; 689 packages installed, 690 audited |
| Node 22.23.2 `npm run lint` | PASS, exit 0; 0 errors/warnings |
| Node 22.23.2 `npm run typecheck` | PASS, exit 0 |
| Node 22.23.2 `npm run test` | PASS, exit 0; 31 files, 563 tests passed, 0 failed/skipped, 99.43 s |
| Node 22.23.2 `npm run build` | PASS, exit 0; 4,097 modules transformed; PWA assets generated |
| Node 22.23.2 `npx playwright install --with-deps chromium` | PASS, exit 0 |
| Node 22.23.2 `npm run test:e2e -- --list` | PASS, exit 0; 68 tests in 4 files |
| `CI=true`, Node 22.23.2 `npm run test:e2e` | PASS, exit 0; 68/68 passed, 0 failed/skipped/filtered, one worker, 3.7 min |
| `git diff --check` | PASS, exit 0 |

CI-mode `forbidOnly` remained active during the 68-test run. No added `test.only`, `test.skip`, `test.fixme`, `describe.only`, or `describe.skip` marker exists in the diff.

## Independent production self-play

After the Node-22 build, the verifier served `dist` through `vite preview --host 127.0.0.1 --port 4184` and drove the visible `/play` UI in headless Chromium. Easy/White completed six legal plies:

```text
e4 e5 Nf3 Nf6 d3 Nc6
```

- Stable move counts after each player/bot pair: `2`, `4`, `6`; no double move.
- `chess.js` replay passed with final FEN `r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 1 4`.
- Turn returned to White after every bot response; no stale or stuck request.
- The page created `/stockfish-worker.js?v=2026-05-30-simplified`, observed `{ type: "ready", success: true }`, and captured 12 `bestmove` outputs. Source: `stockfish_wasm`; no mock/fallback.
- Console errors: 0. Page errors: 0. Failed/HTTP >=400 requests: 0.
- Screenshot visually confirms the locked Option C game UI and the six-move history.

Evidence is in `artifacts/tech-verification/PHASE_0/P0-T04/verifier/`: `commands.json`, `self-play.json`, `self-play.png`, telemetry JSON, and the executable verifier harness.

## Scope and regression audit

- P0-T04's workflow hunk adds only the explicit discovery step between browser installation and full E2E.
- No dependency, dependency version, lockfile, Node engine, Playwright config, theme, palette, CSS, `ui-lab`, or Option C file changed.
- The broader dirty tree contains source/test work from P0-T01 and P0-T02 plus the unfiltered command from P0-T03; this verifier edited none of it.
- `git diff --check` exited 0 after verifier artifacts were produced.

## Acceptance decision

P0-T04 passes. The Node 22 pin resolves inside the declared engine range, the unchanged lockfile installs reproducibly, the encoded workflow is fail-fast and exactly ordered through upload, all workflow-equivalent gates pass under Node 22, the complete 68-test E2E suite is discovered and executed without filtering, and independent production self-play proves the real Stockfish path remains healthy.
