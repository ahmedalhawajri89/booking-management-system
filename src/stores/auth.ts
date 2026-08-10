import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isDemoBackend } from '@/data/repository'

const KEY = 'bookingpro:session:v1'

export type AppRole = 'operator' | 'customer'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: AppRole
}

/**
 * The session, from Supabase Auth when configured and from localStorage when
 * not.
 *
 * The public surface is the same either way — user, isAuthenticated,
 * isOperator, signIn, signOut — so the router guard and every screen work
 * against both. The demo path is still a session that verifies nothing, and
 * says so on the login screen; it exists so the app is usable with no setup.
 *
 * Role comes from app_metadata, never user_metadata: the latter is writable
 * by the user it describes, which would make "operator" self-assignable.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(null)

  /**
   * False until the session has been resolved.
   *
   * This is the whole reason the guard had to change. Supabase restores a
   * session asynchronously, so a synchronous `isAuthenticated` check on a
   * hard load of /app is answered before the session exists — and bounces a
   * signed-in operator to the login screen. The guard waits on this instead.
   */
  const initialised = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const isOperator = computed(() => user.value?.role === 'operator')

  /* ------------------------------------------------------------ demo mode */

  function readLocalSession(): SessionUser | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as SessionUser) : null
    } catch {
      return null
    }
  }

  /* ---------------------------------------------------------------- init */

  async function init(): Promise<void> {
    if (initialised.value) return

    if (isDemoBackend) {
      user.value = readLocalSession()
      initialised.value = true
      return
    }

    const { supabase } = await import('@/data/supabase/client')
    const { data } = await supabase!.auth.getSession()
    user.value = data.session ? toSessionUser(data.session.user) : null
    initialised.value = true

    // Covers refresh, expiry and sign-out in another tab — all of which
    // change who is signed in without this app doing anything.
    supabase!.auth.onAuthStateChange((_event, session) => {
      user.value = session ? toSessionUser(session.user) : null
    })
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  function toSessionUser(u: any): SessionUser {
    return {
      id: u.id,
      email: u.email ?? '',
      name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'مستخدم',
      role: (u.app_metadata?.role as AppRole) ?? 'customer',
    }
  }

  /* -------------------------------------------------------------- actions */

  async function signIn(email: string, password: string): Promise<SessionUser> {
    if (isDemoBackend) {
      const session: SessionUser = {
        id: 'demo-operator',
        name: 'مدير النظام',
        email,
        role: 'operator',
      }
      user.value = session
      try {
        localStorage.setItem(KEY, JSON.stringify(session))
      } catch {
        /* session stays in memory only */
      }
      return session
    }

    const { supabase } = await import('@/data/supabase/client')
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) throw error
    const session = toSessionUser(data.user)
    user.value = session
    return session
  }

  async function signUp(email: string, password: string, fullName: string): Promise<void> {
    if (isDemoBackend) {
      // The demo verifies nothing, so signing up is signing in.
      await signIn(email, password)
      if (user.value) user.value.name = fullName || user.value.name
      return
    }
    const { supabase } = await import('@/data/supabase/client')
    // Role is not set here on purpose. Supabase would accept it in
    // user_metadata, and the database would rightly ignore it — operator
    // access is granted server-side, never claimed at sign-up.
    const { error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
  }

  async function signOut(): Promise<void> {
    user.value = null
    if (isDemoBackend) {
      localStorage.removeItem(KEY)
      return
    }
    const { supabase } = await import('@/data/supabase/client')
    await supabase!.auth.signOut()
  }

  return {
    user,
    initialised,
    isAuthenticated,
    isOperator,
    init,
    signIn,
    signUp,
    signOut,
  }
})
