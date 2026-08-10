<script setup lang="ts">
import { Calendar } from 'lucide-vue-next'

withDefaults(defineProps<{ compact?: boolean; inverse?: boolean }>(), {
  compact: false,
  // Set when the logo sits on the dark hero stage, where the wordmark's
  // gradient half would otherwise disappear into the background.
  inverse: false,
})
</script>

<template>
  <RouterLink to="/" class="flex items-center gap-2">
    <div
      class="rounded-xl text-white"
      :class="[
        compact ? 'p-1.5' : 'p-2.5',
        inverse ? 'border border-white/25 bg-white/10 backdrop-blur' : 'bg-brand shadow-primary-500/25 shadow-lg',
      ]"
    >
      <Calendar :class="compact ? 'h-5 w-5' : 'h-6 w-6'" />
    </div>
    <span
      class="font-bold tracking-tight"
      :class="[compact ? 'text-xl' : 'text-2xl', inverse ? 'text-white' : 'text-fg']"
    >
      حجوزات<span :class="inverse ? 'text-accent-300' : 'text-gradient'">برو</span>
    </span>
  </RouterLink>
</template>
