import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const KEY = 'bookingpro:session:v1'

export interface SessionUser {
  name: string
  email: string
  role: 'owner'
}

/**
 * A deliberately honest demo session: it holds no secrets and verifies nothing.
 * Its job is to make route guards and the signed-in/out UI real, so the
 * navigation model is correct when a real backend replaces it.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(readSession())
  const isAuthenticated = computed(() => user.value !== null)

  function readSession(): SessionUser | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as SessionUser) : null
    } catch {
      return null
    }
  }

  function signIn(email: string, name = 'مدير النظام'): SessionUser {
    const session: SessionUser = { name, email, role: 'owner' }
    user.value = session
    try {
      localStorage.setItem(KEY, JSON.stringify(session))
    } catch {
      /* session stays in memory only */
    }
    return session
  }

  function signOut(): void {
    user.value = null
    localStorage.removeItem(KEY)
  }

  return { user, isAuthenticated, signIn, signOut }
})
