import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface ScrollScenes {
  /** 0–1 across the whole pinned container. */
  progress: Ref<number>
  /** Which scene the viewer is on. */
  sceneIndex: Ref<number>
  /** 0–1 inside the current scene — this is what drives the artifact. */
  sceneProgress: Ref<number>
  goToScene: (i: number) => void
  reduced: boolean
}

/**
 * Turns scroll position over a tall container into a scene index plus a
 * progress value inside that scene, so a pinned stage can be animated
 * directly from the viewer's own scrolling.
 *
 * Built on position: sticky rather than a library. GSAP ScrollTrigger would
 * do this and much more, but it is ~34KB and a second mental model for motion
 * in a project that already has v-reveal and useCountUp doing their own
 * thing. CSS scroll-driven animations are the cleanest answer on paper, but
 * scroll() timelines still behave inconsistently across engines under
 * direction: rtl, and this page is RTL.
 *
 * Under prefers-reduced-motion nothing is registered at all: the caller drops
 * the pinning and renders every scene as an ordinary stacked section. The
 * global reduced-motion rule in main.css kills CSS animation but cannot touch
 * transforms driven from JS, so the check has to live here.
 */
export function useScrollScenes(
  container: Ref<HTMLElement | null>,
  sceneCount: Ref<number> | (() => number),
): ScrollScenes {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const count = typeof sceneCount === 'function' ? computed(sceneCount) : sceneCount

  const progress = ref(0)
  let ticking = false

  function measure() {
    const el = container.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    // Scrollable distance is the container height minus the one viewport the
    // sticky stage occupies; without that subtraction the last scene can
    // never be reached.
    const travel = el.offsetHeight - window.innerHeight
    if (travel <= 0) {
      progress.value = 0
      return
    }
    progress.value = Math.min(1, Math.max(0, -rect.top / travel))
  }

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      measure()
      ticking = false
    })
  }

  const sceneIndex = computed(() =>
    Math.min(count.value - 1, Math.floor(progress.value * count.value)),
  )

  const sceneProgress = computed(() => {
    const raw = progress.value * count.value - sceneIndex.value
    return Math.min(1, Math.max(0, raw))
  })

  function goToScene(i: number) {
    const el = container.value
    if (!el) return
    const travel = el.offsetHeight - window.innerHeight
    // Aim at the middle of the target scene, so the stage settles on it
    // instead of landing on the seam between two.
    const target = ((i + 0.5) / count.value) * travel
    window.scrollTo({
      top: el.offsetTop + target,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

  onMounted(() => {
    if (reduced) return
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  })

  return { progress, sceneIndex, sceneProgress, goToScene, reduced }
}
