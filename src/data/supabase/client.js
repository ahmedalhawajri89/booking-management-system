import { createClient } from '@supabase/supabase-js'

/**
 * The Supabase client, or null when the app is running on local storage.
 *
 * Two env vars decide which backend the app uses, and both are safe to ship:
 * the URL is public and the anon key is public *by design* — RLS is what
 * protects the data, which is why the policies in supabase/migrations/0005
 * are tested rather than assumed.
 *
 * SUPABASE_SERVICE_ROLE_KEY must never appear here or anywhere under src/.
 * It bypasses RLS entirely, and any variable prefixed VITE_ is compiled into
 * the bundle and served to every visitor.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The app has no OAuth callback route; sessions come from password
        // sign-in, so scanning the URL for tokens only adds a failure mode.
        detectSessionInUrl: false,
      },
    })
  : null

/** The single tenant this deployment serves. */
export const ORG_ID = import.meta.env.VITE_SUPABASE_ORG_ID

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}
