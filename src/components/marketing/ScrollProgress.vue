<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Reading position for a long page. rAF-throttled, passive, RTL-aware. */
const progress = ref(0)
let ticking = false

function update() {
  const doc = document.documentElement
  const max = doc.scrollHeight - doc.clientHeight
  progress.value = max <= 0 ? 0 : Math.min(1, doc.scrollTop / max)
  ticking = false
}

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(update)
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div class="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent" aria-hidden="true">
    <div
      class="bg-sunset h-full origin-[right_center] transition-transform duration-75 ease-linear ltr:origin-[left_center]"
      :style="{ transform: `scaleX(${progress})` }"
    />
  </div>
</template>
