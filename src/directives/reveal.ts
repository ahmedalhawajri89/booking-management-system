import type { Directive, DirectiveBinding } from 'vue'

/**
 * `v-reveal` — enter-on-scroll, once, cheaply.
 *
 * One shared IntersectionObserver for the whole page (no scroll listeners),
 * elements unobserve themselves after revealing, and the whole system is a
 * no-op under `prefers-reduced-motion` — content is simply visible.
 *
 *   v-reveal              default rise
 *   v-reveal="120"        120ms stagger delay
 *   v-reveal.scale        rise + settle from 96%
 *   v-reveal.blur         rise + de-blur (use sparingly, hero only)
 */

const REDUCED =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let observer: IntersectionObserver | null = null

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-revealed')
        observer?.unobserve(entry.target)
      }
    },
    // Fire slightly before the element reaches the fold so motion feels
    // anticipatory rather than reactive.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  )
  return observer
}

export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<number | undefined>) {
    if (REDUCED) {
      el.classList.add('is-revealed')
      return
    }
    el.classList.add('reveal')
    if (binding.modifiers.scale) el.classList.add('reveal-scale')
    if (binding.modifiers.blur) el.classList.add('reveal-blur')
    if (typeof binding.value === 'number') {
      el.style.transitionDelay = `${binding.value}ms`
    }
    getObserver().observe(el)
  },
  unmounted(el: HTMLElement) {
    observer?.unobserve(el)
  },
}
