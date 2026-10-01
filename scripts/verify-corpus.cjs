const { spawnSync } = require('node:child_process');
const path = require('node:path');

const result = spawnSync(process.execPath, [
  path.join(__dirname, 'validate-puzzle-corpus.mjs'),
  ...process.argv.slice(2),
], { stdio: 'inherit' });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
