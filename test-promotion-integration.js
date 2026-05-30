// Promotion Integration Test Script
// Paste this into Chrome DevTools Console on http://localhost:5173/play

console.log('%c🧪 Starting Promotion Integration Test', 'color: #3b82f6; font-size: 16px; font-weight: bold');

// Helper to wait for game to be ready
function waitForGame() {
  return new Promise((resolve) => {
    const check = () => {
      // Try to access the game through React DevTools or window
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// Test 1: Load a position with white pawn ready to promote
console.log('%c📋 Test 1: Load white pawn promotion position', 'color: #f59e0b');
console.log('Instructions:');
console.log('1. The board should now show a white pawn on a7');
console.log('2. Drag the pawn from a7 to a8 (or click a7 then click a8)');
console.log('3. Check console for "[MOVE] rejected: promotion required" error');
console.log('4. The pawn should promote to Queen automatically');
console.log('');
console.log('FEN to load: 8/P7/8/8/8/8/8/4k2K w - - 0 1');
console.log('');
console.log('%cTo load this position, you need to:', 'color: #22c55e');
console.log('1. Start a new game in the UI');
console.log('2. Use browser React DevTools to access the game context');
console.log('3. Or manually set up a position where a pawn can promote');
console.log('');

// Test 2: Instructions for black pawn promotion
console.log('%c📋 Test 2: Black pawn promotion', 'color: #f59e0b');
console.log('FEN to test: 4K2k/8/8/8/8/8/p7/8 b - - 0 1');
console.log('Move: a2 to a1 (should promote to Queen)');
console.log('');

// Test 3: Check for console errors
console.log('%c📋 Test 3: Monitor console for errors', 'color: #f59e0b');
console.log('Watch for these errors (should NOT appear):');
console.log('  ❌ [MOVE] rejected: promotion required');
console.log('  ❌ chess.js rejected move');
console.log('');

// Test 4: Normal moves
console.log('%c📋 Test 4: Normal moves (regression test)', 'color: #f59e0b');
console.log('Make some normal moves (e2-e4, Nf3, etc.)');
console.log('Ensure no errors and sound plays correctly');
console.log('');

console.log('%c✅ Manual Test Checklist:', 'color: #22c55e; font-size: 14px; font-weight: bold');
console.log('[ ] White pawn promotion (drag/drop) - no console error');
console.log('[ ] White pawn promotion (click-to-move) - no console error');
console.log('[ ] Black pawn promotion - no console error');
console.log('[ ] Promoted piece is Queen');
console.log('[ ] Normal moves still work');
console.log('[ ] Move sound plays');
console.log('[ ] Capture sound plays');
console.log('[ ] Bot can still move');
console.log('[ ] No "[MOVE] rejected: promotion required" error');
console.log('');

console.log('%c🎯 Quick Test:', 'color: #3b82f6; font-size: 14px; font-weight: bold');
console.log('1. Start a game vs Bot');
console.log('2. Play until you can promote a pawn');
console.log('3. Promote the pawn (drag or click)');
console.log('4. Check console - should be NO errors');
console.log('5. Verify the pawn became a Queen');
console.log('');

console.log('%c📊 Expected Result:', 'color: #22c55e');
console.log('✅ Pawn promotes to Queen automatically');
console.log('✅ No "[MOVE] rejected: promotion required" error');
console.log('✅ Move sound plays');
console.log('✅ Game continues normally');
console.log('');

console.log('%cTest script loaded. Follow the checklist above.', 'color: #94a3b8');
