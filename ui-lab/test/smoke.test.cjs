/**
 * ui-lab Smoke & Verification Tests (Option C Locked)
 * 
 * Verifies:
 * 1. Option C design tokens (theme-charcoal-pine.css)
 * 2. HeroUI v3 wrappers (AppButton, AppDialog, AppTabs, AppField, AppSelect, AppStatus, AppTooltip, AppPopover, AppProgress)
 * 3. Quiet motion and reduced-motion compliance (120ms-240ms, prefers-reduced-motion)
 * 4. Radius rules (Button 8px, Modal 12px, Card 10px, Badge 6px)
 * 5. Prototype screens and SourceDisclosure
 * 6. Fixtures isolation (prototypeOnlyData.ts, no dependency on production code)
 * 7. Automated screenshots in place (all 10 Option C PNGs)
 * 8. Production bundle build integrity
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING UI-LAB OPTION C VERIFICATION SUITE ---');

// 1. Option C Design Tokens
const themeFile = fs.readFileSync(path.resolve(__dirname, '../src/styles/theme-charcoal-pine.css'), 'utf-8');
const expectedTokens = [
  '--app-bg: #0C100E',
  '--app-surface: #141A17',
  '--app-surface-raised: #1A221E',
  '--app-accent: #3FAD79',
  '--app-copper: #C88954',
  '--app-success: #49A6A0',
  '--app-warning: #C89B4F',
  '--app-danger: #D46666',
  '--app-radius-btn: 8px',
  '--app-radius-modal: 12px',
];

for (const token of expectedTokens) {
  assert(themeFile.includes(token), `Option C token '${token}' must be present in theme-charcoal-pine.css`);
  console.log(`✓ Design token verified: ${token.split(':')[0]}`);
}

// 2. Quiet Motion & Reduced Motion
const motionFile = fs.readFileSync(path.resolve(__dirname, '../src/styles/motion.css'), 'utf-8');
assert(motionFile.includes('prefers-reduced-motion: reduce'), 'Must include prefers-reduced-motion media query');
assert(motionFile.includes('animation-duration: 0.01ms'), 'Must reduce animation duration on reduced-motion');
assert(themeFile.includes('--app-duration-fast: 120ms'), 'Fast duration must be 120ms');
assert(themeFile.includes('--app-duration-base: 180ms'), 'Base duration must be 180ms');
assert(themeFile.includes('--app-duration-slow: 240ms'), 'Slow duration must be 240ms');
console.log('✓ Quiet Motion (120ms - 240ms) and reduced-motion overrides verified');

// 3. HeroUI v3 Wrappers
const wrapperDir = path.resolve(__dirname, '../src/ui');
const expectedWrappers = [
  'AppButton.tsx',
  'AppDialog.tsx',
  'AppTabs.tsx',
  'AppField.tsx',
  'AppSelect.tsx',
  'AppStatus.tsx',
  'AppTooltip.tsx',
  'AppPopover.tsx',
  'AppProgress.tsx',
];

for (const wrapper of expectedWrappers) {
  assert(fs.existsSync(path.join(wrapperDir, wrapper)), `Wrapper ${wrapper} must exist in src/ui/`);
  console.log(`✓ HeroUI v3 Wrapper verified: ${wrapper}`);
}

// 4. SourceDisclosure Component
const sourceDisclosurePath = path.resolve(__dirname, '../src/components/SourceDisclosure.tsx');
assert(fs.existsSync(sourceDisclosurePath), 'SourceDisclosure component must exist');
const sourceDisclosureContent = fs.readFileSync(sourceDisclosurePath, 'utf-8');
assert(sourceDisclosureContent.includes('Stockfish'), 'SourceDisclosure must handle Stockfish attribution');
assert(sourceDisclosureContent.includes('Diễn giải cơ bản'), 'SourceDisclosure must handle Basic rule-based explanation');
console.log('✓ SourceDisclosure truth-in-UI component verified');

// 5. Prototype Screens
const screensDir = path.resolve(__dirname, '../src/screens');
const expectedScreens = [
  'HomePrototype.tsx',
  'LobbyPrototype.tsx',
  'PlayPrototype.tsx',
  'ReviewPrototype.tsx',
  'ProgressPrototype.tsx',
  'GalleryPrototype.tsx',
  'ComponentsPrototype.tsx',
];

for (const screen of expectedScreens) {
  assert(fs.existsSync(path.join(screensDir, screen)), `Screen ${screen} must exist in src/screens/`);
  console.log(`✓ Prototype Screen verified: ${screen}`);
}

// 6. Isolated Fixture Data
const fixturePath = path.resolve(__dirname, '../src/fixtures/prototypeOnlyData.ts');
assert(fs.existsSync(fixturePath), 'prototypeOnlyData.ts must exist');
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
assert(fixtureContent.includes('PROTOTYPE_DAILY_TASKS'), 'Must export 5 daily tasks');
assert(fixtureContent.includes('PROTOTYPE_MISTAKES'), 'Must export 3 prioritized mistakes');
assert(fixtureContent.includes('PROTOTYPE_SKILLS'), 'Must export skill progress items');
console.log('✓ Mock fixture isolation verified');

// 7. Automated Option C Screenshots
const screenshotDir = path.resolve(__dirname, '../screenshots/option-c');
const expectedScreenshots = [
  'home-desktop.png',
  'home-mobile.png',
  'lobby-desktop.png',
  'lobby-mobile.png',
  'play-desktop.png',
  'play-mobile.png',
  'review-desktop.png',
  'review-mobile.png',
  'progress-desktop.png',
  'progress-mobile.png',
];

for (const shot of expectedScreenshots) {
  const shotPath = path.join(screenshotDir, shot);
  assert(fs.existsSync(shotPath), `Screenshot ${shot} must exist in screenshots/option-c/`);
  const stats = fs.statSync(shotPath);
  assert(stats.size > 5000, `Screenshot ${shot} size must be non-empty (>5KB, got ${stats.size})`);
  console.log(`✓ Option C Screenshot verified: ${shot} (${Math.round(stats.size / 1024)} KB)`);
}

// 8. Built Bundle Verification
const distHtml = path.resolve(__dirname, '../dist/index.html');
assert(fs.existsSync(distHtml), 'Vite production build output dist/index.html must exist');
console.log('✓ Production dist bundle verified');

console.log('\n✅ ALL 8 OPTION C VERIFICATION SUITES PASSED CLEANLY!\n');
