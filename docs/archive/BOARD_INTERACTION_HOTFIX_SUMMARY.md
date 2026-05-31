# Board Interaction Hotfix Summary

## Console/runtime issue
- Same-square drag/drop no longer calls `makeMove`, so it should not emit `[MOVE] rejected: invalid from/to` for a no-op board interaction.
- `onboarding`, `getImageNode`, and `content-script` were searched in the repo. No app source for that script was found, so the `onboarding.js/getImageNode` stack is most likely from a browser extension, DevTools overlay, or injected third-party content script.

## Files changed
- `src/components/chess/ChessBoardPanel.jsx`

## What was intentionally not changed
- Engine/bot logic
- Chess rules or move validation in context
- UI layout or redesign
- App workaround for external browser extension scripts

## Build result
- `npm run build`: pass

## Manual test
- Click piece to select: pass
- Click same selected square to deselect: pass
- Drag/drop piece back to the same square: pass
- Legal drag/drop still makes a move: pass
- Local `/play` console after board interactions: no `[MOVE] rejected` and no `invalid from/to`

## Remaining risks
- The `onboarding.js/getImageNode` console error can still appear when the responsible extension or DevTools experiment is enabled. Re-test in Incognito or with extensions disabled to confirm.
