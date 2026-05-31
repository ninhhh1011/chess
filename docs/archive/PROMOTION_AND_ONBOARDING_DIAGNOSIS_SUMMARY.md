# Promotion and Onboarding Diagnosis Summary

## Console errors investigated
- onboarding.js/getImageNode
- [MOVE] rejected: promotion required

## onboarding.js diagnosis
- Found in repo: no
- Found in dist: no
- Likely source: browser extension
- Action taken: `onboarding.js/getImageNode` is not part of this repository or build output. Stack trace includes `content-script.js`, so it is most likely injected by a browser extension. Reproduce with Incognito / extensions disabled. No app code was modified for this issue.

## promotion required root cause
- Caller passed null/undefined promotion for pawn promotion.
- Chess.js requires promotion piece.

## Files changed
- `src/components/chess/ChessBoardPanel.jsx`
- `src/contexts/ChessGameContext.tsx`

## Promotion behavior
- Default promotion: queen (`q`)
- Drag/drop promotion: pass
- Click promotion: pass
- Bot promotion: pass

## Build result
- npm run build: pass

## Manual test result
- White promotion: pass
- Black promotion: pass
- Normal moves: pass
- Bot move: pass
- Same-square drag/drop: pass

## Remaining risks
- Underpromotion is not currently supported because the UI modal was explicitly excluded from this task. Players will always promote to a Queen.
