#!/usr/bin/env node
/**
 * Fails if a service-role key could reach the browser.
 *
 * Everything Vite compiles from src/ is public, and the service role key
 * bypasses Row Level Security entirely — one careless import turns every
 * policy in supabase/migrations/0005 into decoration. This is cheap to run
 * and catches the mistake before it ships, which is the only time it is
 * cheap to catch.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['src', 'scripts']
const PATTERNS = [
  { re: /service_role/i, why: 'service role key or role name' },
  { re: /VITE_[A-Z_]*SERVICE_ROLE/i, why: 'service role exposed through a VITE_ variable' },
  // A Supabase JWT; the anon key is one too, so this only fires on literals
  // rather than on a reference to an env var.
  { re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\./, why: 'hard-coded JWT' },
]

const offences = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!/\.(ts|tsx|js|mjs|vue|json)$/.test(entry)) continue
    // This file necessarily contains the patterns it looks for.
    if (path.endsWith('check-secrets.mjs')) continue

    const text = readFileSync(path, 'utf8')
    text.split('\n').forEach((line, i) => {
      // Comments are skipped, and that is a deliberate trade: the code should
      // be free to explain why this key is dangerous without tripping the
      // check that enforces it. Comments are also stripped from the
      // production bundle, so the exposure this guards against is in code.
      if (/^\s*(\/\/|\/?\*|#)/.test(line)) return

      for (const p of PATTERNS) {
        if (p.re.test(line)) offences.push({ path, line: i + 1, why: p.why })
      }
    })
  }
}

for (const root of ROOTS) {
  try {
    walk(root)
  } catch {
    /* missing directory is fine */
  }
}

if (offences.length > 0) {
  console.error('✗ secrets check failed\n')
  for (const o of offences) console.error(`  ${o.path}:${o.line} — ${o.why}`)
  console.error('\nThe service role key belongs in Edge Function secrets, never in src/.')
  process.exit(1)
}

console.log('✓ no service-role credentials in shipped code')
