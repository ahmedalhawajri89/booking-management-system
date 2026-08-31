<script setup>
/** Matches the geometry of the real content, so nothing jumps on load. */
defineProps({
  variant: { type: String, required: false, default: 'text' },
  count: { type: Number, required: false, default: 1 },
})

// .skeleton adds the sweep (see main.css). It was defined there but never
// applied, so every placeholder sat perfectly still and read as broken
// layout rather than as loading.
const BAR = 'skeleton bg-surface-sunken rounded'
</script>

<template>
  <div class="space-y-3" role="status" aria-live="polite" aria-label="جارٍ التحميل">
    <template v-for="i in count" :key="i">
      <div
        v-if="variant === 'text'"
        class="h-4"
        :class="BAR"
        :style="{ width: `${90 - i * 8}%` }"
      />

      <div v-else-if="variant === 'row'" class="flex items-center gap-3 py-3">
        <div class="skeleton bg-surface-sunken h-9 w-9 shrink-0 rounded-full" />
        <div class="flex-1 space-y-2">
          <div class="h-3.5 w-1/3" :class="BAR" />
          <div class="h-3 w-1/2" :class="BAR" />
        </div>
        <div class="h-6 w-20 shrink-0" :class="BAR" />
      </div>

      <div v-else class="surface space-y-3 p-4">
        <div class="h-4 w-1/3" :class="BAR" />
        <div class="h-8 w-1/2" :class="BAR" />
        <div class="h-3 w-2/3" :class="BAR" />
      </div>
    </template>
    <span class="sr-only">جارٍ التحميل…</span>
  </div>
</template>
