#!/usr/bin/env node
/**
 * Fails if a backend secret could reach the browser.
 *
 * Everything Vite compiles from src/ is public. The API's own credentials —
 * APP_KEY, the database password, mail and queue secrets — live in api/.env
 * and must never cross into the bundle; one careless `VITE_` prefix turns a
 * private key into a published one. This is cheap to run and catches the
 * mistake before it ships, which is the only time it is cheap to catch.
 *
 * src/ and scripts/ are scanned. api/ is not: it is server code, where these
 * values are supposed to be.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['src', 'scripts']
const PATTERNS = [
  { re: /VITE_[A-Z_]*(SECRET|PASSWORD|APP_KEY|PRIVATE|TOKEN_SECRET)/i, why: 'backend secret exposed through a VITE_ variable' },
  { re: /\bDB_PASSWORD\b/, why: 'database password' },
  { re: /\bAPP_KEY\b/, why: 'Laravel application key' },
  // base64:... is the shape APP_KEY takes in a Laravel .env.
  { re: /base64:[A-Za-z0-9+/]{40,}={0,2}/, why: 'hard-coded application key' },
  // A JWT literal, rather than a reference to an env var.
  { re: /eyJhbGciOi[A-Za-z0-9_-]+\./, why: 'hard-coded JWT' },
]

const offences = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!/\.(js|mjs|vue|json)$/.test(entry)) continue
    // This file necessarily contains the patterns it looks for.
    if (path.endsWith('check-secrets.mjs')) continue

    const text = readFileSync(path, 'utf8')
    text.split('\n').forEach((line, i) => {
      // Comments are skipped, and that is a deliberate trade: the code should
      // be free to explain why a value is dangerous without tripping the
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
  console.error('\nBackend secrets belong in api/.env, never in src/.')
  process.exit(1)
}

console.log('✓ no backend credentials in shipped code')
