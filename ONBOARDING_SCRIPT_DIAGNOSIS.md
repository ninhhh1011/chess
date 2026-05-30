# Onboarding Script Diagnosis

## Error Details
```
onboarding.js:48 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'getImageNode')
    at P (onboarding.js:48...)
    ...
    c.emit @ content-script.js:30
```

## Investigation Results

### 1. Repository Search
**Search for `onboarding` in source:**
- Found in: `BOARD_INTERACTION_HOTFIX_SUMMARY.md`, `RUNTIME_LOG_HOTFIX_SUMMARY.md` (documentation only)
- **NOT found in any source code files**

**Search for `getImageNode` in source:**
- Found in: `BOARD_INTERACTION_HOTFIX_SUMMARY.md` (documentation only)
- **NOT found in any source code files**

**Search for `content-script` in source:**
- Found in: `BOARD_INTERACTION_HOTFIX_SUMMARY.md` (documentation only)
- **NOT found in any source code files**

**Search for `chrome-extension` or `moz-extension`:**
- **NOT found in any source code files**

### 2. Build Output Search
**Build command:** `npm run build` ✅ PASS

**Search in `dist/` directory:**
- `onboarding`: **NOT FOUND**
- `getImageNode`: **NOT FOUND**
- `content-script`: **NOT FOUND**

**dist/index.html inspection:**
- Only contains Vite-generated bundle scripts
- No external script tags
- No analytics or third-party widgets

### 3. Configuration & Entry Points
**index.html:**
- Clean: only contains `<div id="root"></div>` and Vite module script

**package.json:**
- No suspicious dependencies
- Standard React + Chess libraries only

**vite.config.js:**
- Clean Vite configuration
- No plugin injecting external scripts
- Only COOP/COEP headers for Stockfish SharedArrayBuffer

**public/ directory:**
- Only contains: `stockfish.js`, `stockfish.wasm`, `stockfish-worker.js`, `favicon.svg`
- No `onboarding.js` or suspicious scripts

**src/ directory:**
- No dynamic script injection found
- No `createElement('script')`, `document.write`, or `innerHTML` with scripts
- No analytics/tracking code (only CSS reference to "google" fonts)

## Conclusion

### Source of Error: **Browser Extension or Injected Content Script**

The error stack trace includes:
- `onboarding.js` - NOT part of this repository
- `content-script.js` - NOT part of this repository
- `c.emit` - Event emitter pattern typical of browser extensions

### Evidence:
1. ✅ `onboarding.js` does NOT exist in source code
2. ✅ `getImageNode` does NOT exist in source code
3. ✅ `content-script.js` does NOT exist in source code
4. ✅ Build output (`dist/`) contains NO references to these files
5. ✅ No third-party scripts injected via HTML, config, or dependencies
6. ✅ Stack trace pattern matches browser extension injection

### Most Likely Culprits:
- Browser extension with onboarding/tutorial features
- DevTools extension or overlay
- Screen capture/annotation extension
- Productivity or workflow extension

## Reproduction & Verification

### How to Reproduce:
1. Open https://chess-brown-two.vercel.app/ in normal browser mode
2. Open DevTools Console
3. Interact with the page
4. Error appears (if extension is active)

### How to Verify It's NOT the App:
1. Open https://chess-brown-two.vercel.app/ in **Incognito/Private mode**
2. Ensure **all extensions are disabled**
3. Open DevTools Console
4. Interact with the page
5. **Expected result:** Error should NOT appear

### Alternative Verification:
1. Check `chrome://extensions` or `about:addons` (Firefox)
2. Disable extensions one by one
3. Refresh the app after each disable
4. Identify which extension causes the error

## Recommendation

**DO NOT modify app code.**

This error originates from an external browser extension injecting `onboarding.js` and `content-script.js` into the page. The app has no control over this injection.

### If Error Must Be Suppressed:
Only if the extension is confirmed to be widely used by target users AND causes functional issues (not just console noise), consider adding a defensive guard in the app's error boundary or global error handler:

```javascript
window.addEventListener('error', (event) => {
  if (event.filename?.includes('onboarding.js') || 
      event.filename?.includes('content-script.js')) {
    event.preventDefault(); // Suppress external extension errors
    return true;
  }
});
```

**However, this is NOT recommended** because:
- It masks legitimate errors from actual extensions users rely on
- The error does not affect app functionality
- It's the extension's responsibility to fix their code

## Build Status
✅ `npm run build` - PASS
✅ No app code changes required
✅ Chess game functionality unaffected

## Date
Investigation completed: 2026-05-30
