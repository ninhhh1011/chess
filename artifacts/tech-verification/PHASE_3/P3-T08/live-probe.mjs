import { lookup } from 'node:dns/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
    }),
);

const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const hostname = url ? new URL(url).hostname : null;
const result = {
  checkedAt: new Date().toISOString(),
  configured: Boolean(url && anonKey),
  hostname,
  dns: { ok: false },
  query: { ok: false },
};

if (hostname) {
  try {
    const address = await lookup(hostname);
    result.dns = { ok: true, family: address.family };
  } catch (error) {
    result.dns = { ok: false, code: error.code ?? 'UNKNOWN' };
  }
}

if (url && anonKey) {
  try {
    const client = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await client.from('user_progress').select('user_id').limit(1);
    result.query = error
      ? { ok: false, message: error.message }
      : { ok: true };
  } catch (error) {
    result.query = { ok: false, message: error.message };
  }
}

writeFileSync(
  'artifacts/tech-verification/PHASE_3/P3-T08/live-probe.json',
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
