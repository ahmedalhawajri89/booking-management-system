import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

const REDUCED =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Counts a number up once it scrolls into view. Used for proof figures, where
 * the motion is the point — a number that arrives feels measured, a number
 * that is simply there reads as decoration.
 */
export function useCountUp(target: number, durationMs = 1400) {
  const value = ref(0)
  const el: Ref<HTMLElement | null> = ref(null)
  let raf = 0
  let io: IntersectionObserver | null = null

  function run() {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // easeOutExpo — fast arrival, soft landing
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      value.value = Math.round(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  onMounted(() => {
    if (REDUCED || !el.value) {
      value.value = target
      return
    }
    io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        io?.disconnect()
        run()
      },
      { threshold: 0.4 },
    )
    io.observe(el.value)
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    io?.disconnect()
  })

  return { value, el }
}
