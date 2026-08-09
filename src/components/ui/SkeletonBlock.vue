<script setup lang="ts">
/** Matches the geometry of the real content, so nothing jumps on load. */
withDefaults(defineProps<{ variant?: 'text' | 'row' | 'card'; count?: number }>(), {
  variant: 'text',
  count: 1,
})
</script>

<template>
  <div class="space-y-3" role="status" aria-live="polite" aria-label="جارٍ التحميل">
    <template v-for="i in count" :key="i">
      <div
        v-if="variant === 'text'"
        class="h-4 rounded bg-gray-100"
        :style="{ width: `${90 - i * 8}%` }"
      />

      <div v-else-if="variant === 'row'" class="flex items-center gap-3 py-3">
        <div class="h-9 w-9 shrink-0 rounded-full bg-gray-100" />
        <div class="flex-1 space-y-2">
          <div class="h-3.5 w-1/3 rounded bg-gray-100" />
          <div class="h-3 w-1/2 rounded bg-gray-100" />
        </div>
        <div class="h-6 w-20 shrink-0 rounded bg-gray-100" />
      </div>

      <div v-else class="surface space-y-3 p-4">
        <div class="h-4 w-1/3 rounded bg-gray-100" />
        <div class="h-8 w-1/2 rounded bg-gray-100" />
        <div class="h-3 w-2/3 rounded bg-gray-100" />
      </div>
    </template>
    <span class="sr-only">جارٍ التحميل…</span>
  </div>
</template>
