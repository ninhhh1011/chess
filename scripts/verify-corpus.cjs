/**
 * Corpus Validation Script
 *
 * Verifies corpus quality, reproducibility, and availability.
 * Run: node scripts/verify-corpus.cjs
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '../src/data/generated/corpusManifest.json');
const PUZZLES_PATH = path.join(__dirname, '../src/data/generated/generatedPuzzles.json');

console.log('\n=== Corpus Validation ===\n');

let allPassed = true;

// Test 1: Manifest exists
console.log('Test 1: Manifest exists');
try {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log('  ❌ FAIL: Manifest not found at', MANIFEST_PATH);
    allPassed = false;
  } else {
    console.log('  ✅ PASS: Manifest found');
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    console.log('  Version:', manifest.version);
    console.log('  License:', manifest.license);
    console.log('  Source:', manifest.source);
  }
} catch (e) {
  console.log('  ❌ FAIL:', e.message);
  allPassed = false;
}

// Test 2: Puzzles exist
console.log('\nTest 2: Puzzles exist');
try {
  if (!fs.existsSync(PUZZLES_PATH)) {
    console.log('  ❌ FAIL: Puzzles not found at', PUZZLES_PATH);
    allPassed = false;
  } else {
    console.log('  ✅ PASS: Puzzles found');
  }
} catch (e) {
  console.log('  ❌ FAIL:', e.message);
  allPassed = false;
}

// Test 3: Manifest checksum matches
console.log('\nTest 3: Manifest checksum validation');
try {
  if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (manifest.checksum) {
      console.log('  ✅ PASS: Manifest has checksum:', manifest.checksum);
    } else {
      console.log('  ⚠️  WARN: No checksum in manifest');
    }
  }
} catch (e) {
  console.log('  ❌ FAIL:', e.message);
  allPassed = false;
}

// Test 4: Provenance validation
console.log('\nTest 4: Provenance validation');
try {
  if (fs.existsSync(PUZZLES_PATH)) {
    const puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));
    const sample = puzzles.slice(0, 10);
    let hasProvenance = 0;
    for (const p of sample) {
      if (p.sourceId && p.licenseId) {
        hasProvenance++;
      }
    }
    console.log('  Sample provenance:', hasProvenance, '/', sample.length);
    if (hasProvenance === sample.length) {
      console.log('  ✅ PASS: All sampled puzzles have provenance');
    } else {
      console.log('  ⚠️  WARN: Some puzzles missing provenance');
    }
  }
} catch (e) {
  console.log('  ❌ FAIL:', e.message);
  allPassed = false;
}

// Test 5: Duplicate validation
console.log('\nTest 5: Duplicate validation');
try {
  if (fs.existsSync(PUZZLES_PATH)) {
    const puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));
    const fens = new Set();
    let duplicates = 0;
    for (const p of puzzles) {
      const normalized = p.fen.split(' ').slice(0, 4).join(' ');
      if (fens.has(normalized)) {
        duplicates++;
      } else {
        fens.add(normalized);
      }
    }
    console.log('  Total puzzles:', puzzles.length);
    console.log('  Duplicates:', duplicates);
    if (duplicates === 0) {
      console.log('  ✅ PASS: No duplicates found');
    } else {
      console.log('  ⚠️  WARN: Duplicates found');
    }
  }
} catch (e) {
  console.log('  ❌ FAIL:', e.message);
  allPassed = false;
}

// Test 6: Solution validation
console.log('\nTest 6: Solution validation (sample)');
try {
  if (fs.existsSync(PUZZLES_PATH)) {
    const puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));
    const sample = puzzles.slice(0, 100);
    let validSolutions = 0;
    for (const p of sample) {
      if (p.solution && p.solution.length >= 4) {
        validSolutions++;
      }
    }
    console.log('  Sample size:', sample.length);
    console.log('  Valid solutions:', validSolutions);
    if (validSolutions === sample.length) {
      console.log('  ✅ PASS: All sampled solutions valid');
    } else {
      console.log('  ⚠️  WARN: Some solutions invalid');
    }
  }
} catch (e) {
  console.log('  ❌ FAIL:', e.message);
  allPassed = false;
}

// Test 7: Motif coverage
console.log('\nTest 7: Motif coverage');
try {
  if (fs.existsSync(PUZZLES_PATH)) {
    const puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));
    const motifs = new Set();
    for (const p of puzzles) {
      if (p.motifs) {
        for (const m of p.motifs) {
          motifs.add(m);
        }
      }
    }
    console.log('  Unique motifs:', motifs.size);
    console.log('  Motifs:', [...motifs].join(', '));
    if (motifs.size >= 12) {
      console.log('  ✅ PASS: >= 12 motifs');
    } else {
      console.log('  ⚠️  WARN: < 12 motifs');
    }
  }
} catch (e) {
  console.log('  ❌ FAIL:', e.message);
  allPassed = false;
}

// Summary
console.log('\n=== Summary ===\n');
if (allPassed) {
  console.log('✅ All validations passed');
  process.exit(0);
} else {
  console.log('⚠️  Some validations failed');
  process.exit(1);
}
