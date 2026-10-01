import { lookup } from 'node:dns/promises';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('artifacts/tech-verification/PHASE_3/P3-T08/verifier');
await mkdir(output, { recursive: true });
const env = Object.fromEntries(
  (await readFile('.env.local', 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')];
    }),
);
const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const hostname = url ? new URL(url).hostname : null;
const dns = async (name) => {
  try {
    const address = await lookup(name);
    return { ok: true, family: address.family };
  } catch (error) {
    return { ok: false, code: error.code ?? error.cause?.code ?? 'UNKNOWN' };
  }
};
const result = {
  checkedAt: new Date().toISOString(), configured: Boolean(url && anonKey), hostname,
  controlDns: await dns('supabase.co'), projectDns: hostname ? await dns(hostname) : { ok: false, code: 'NO_HOST' },
  query: { ok: false },
};

if (url && anonKey) {
  try {
    const response = await fetch(`${url}/rest/v1/user_progress?select=user_id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    result.query = { ok: response.ok, status: response.status };
  } catch (error) {
    result.query = {
      ok: false,
      name: error.name,
      message: error.message,
      causeCode: error.cause?.code ?? 'UNKNOWN',
    };
  }
}

await writeFile(path.join(output, 'live-probe.json'), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
