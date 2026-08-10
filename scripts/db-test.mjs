#!/usr/bin/env node
/**
 * Applies every migration to a throwaway Postgres and runs the SQL tests.
 *
 * The database rules — no double-booking, RLS, the guest RPC — are the part of
 * this app that cannot be checked by reading. This runs them for real against
 * the same Postgres version Supabase uses, so a policy that leaks or a
 * constraint that does not hold fails here rather than in production.
 *
 * Needs Docker. `node scripts/db-test.mjs`, or `npm run db:test`.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const CONTAINER = 'bookingpro-db-test'
const IMAGE = 'postgres:16-alpine'
const DB = 'app'

const run = (args, opts = {}) =>
  execFileSync('docker', args, { encoding: 'utf8', stdio: 'pipe', ...opts })

const quiet = (args) => {
  try {
    return run(args)
  } catch {
    return ''
  }
}

/**
 * Both streams matter: psql prints \echo to stdout but `raise notice` — which
 * is how the tests report each assertion — to stderr. Capturing only stdout
 * silently drops most of the evidence.
 */
function psql(file) {
  const r = spawnSync(
    'docker',
    ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-q', '-f', file],
    { encoding: 'utf8' },
  )
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`
  if (r.status !== 0) throw new Error(output)
  return output
}

console.log('› starting postgres…')
quiet(['rm', '-f', CONTAINER])
run(['run', '-d', '--name', CONTAINER, '-e', 'POSTGRES_PASSWORD=pg', '-e', `POSTGRES_DB=${DB}`, IMAGE])

// Wait for readiness rather than sleeping a guessed number of seconds.
let ready = false
for (let i = 0; i < 60 && !ready; i++) {
  try {
    run(['exec', CONTAINER, 'pg_isready', '-U', 'postgres', '-d', DB])
    ready = true
  } catch {
    execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},500)'])
  }
}
if (!ready) {
  console.error('✗ postgres never became ready')
  process.exit(1)
}

run(['cp', 'supabase', `${CONTAINER}:/supabase`])

let failed = false
try {
  // The shim stands in for what Supabase itself provides (auth schema, roles).
  console.log('› applying shim + migrations')
  psql('/supabase/tests/00_shim.sql')
  for (const f of readdirSync('supabase/migrations').sort()) {
    psql(`/supabase/migrations/${f}`)
    console.log(`  ok ${f}`)
  }

  console.log('› running tests')
  const tests = readdirSync('supabase/tests')
    .filter((f) => f !== '00_shim.sql' && f.endsWith('.sql'))
    .sort()

  for (const f of tests) {
    const out = psql(join('/supabase/tests', f).replace(/\\/g, '/'))
    for (const line of out.split('\n')) {
      const m = line.match(/(PASS|FAIL|==) .*/)
      if (m) console.log('  ' + m[0].replace(/^==\s*/, '== ').trim())
    }
  }
} catch (e) {
  failed = true
  console.error('\n✗ database tests failed\n')
  console.error((e.stderr || e.stdout || String(e)).toString().trim())
} finally {
  quiet(['rm', '-f', CONTAINER])
}

if (failed) process.exit(1)
console.log('\n✓ database tests passed')
